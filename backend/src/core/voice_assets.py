"""Content-addressed storage for nonpersonal voice assets, outside the webroot."""

import asyncio
import contextlib
import fcntl
import hashlib
import json
import os
import pathlib
import re
import tempfile
import time

from . import config

DELIVERY_VERSION = 'coach-delivery-v1'


def key(text: str, voice: str, model: str, language: str, style: str, version: str) -> str:
    body = {
        'text': text,
        'voice': voice,
        'model': model,
        'language': language,
        'style': style,
        'version': version,
        'delivery': DELIVERY_VERSION,
        'format': config.get_settings().ELEVENLABS_OUTPUT_FORMAT,
    }
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()


def valid_audio(data: bytes) -> bool:
    return 16 <= len(data) <= 5 * 1024 * 1024 and (
        data.startswith(b'ID3') or (data[0] == 255 and data[1] & 224 == 224)
    )


def path(cache_key: str, suffix: str = '.mp3') -> pathlib.Path | None:
    if not re.fullmatch('[a-f0-9]{64}', cache_key):
        raise ValueError('Invalid asset key')
    root = config.get_settings().AUDIO_SHARED_CACHE_DIR
    return pathlib.Path(root) / (cache_key + suffix) if root else None


def _read(target: pathlib.Path | None) -> bytes | None:
    if target is None:
        return None
    try:
        if target.stat().st_size > 5 * 1024 * 1024:
            return None
        data = target.read_bytes()
        return data if valid_audio(data) else None
    except OSError:
        return None


async def get(cache_key: str) -> bytes | None:
    return await asyncio.to_thread(_read, path(cache_key))


def _write(target: pathlib.Path, data: bytes) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    # A separate directory lock protects the disk cap across API/CLI processes.
    with (target.parent / '.capacity.lock').open('a+b') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        used = sum(
            p.stat().st_size for p in target.parent.iterdir() if p.suffix in {'.mp3', '.json'}
        )
        maximum = config.get_settings().AUDIO_SHARED_CACHE_MAX_MB * 1024 * 1024
        previous = target.stat().st_size if target.exists() else 0
        if used - previous + len(data) > maximum:
            return False
        descriptor, temporary = tempfile.mkstemp(dir=target.parent, prefix='.pending-')
        try:
            with os.fdopen(descriptor, 'wb') as output:
                output.write(data)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, target)
        finally:
            pathlib.Path(temporary).unlink(missing_ok=True)
    return True


async def put(cache_key: str, data: bytes) -> bool:
    target = path(cache_key)
    if target is None or not valid_audio(data):
        return False
    try:
        return await asyncio.to_thread(_write, target, data)
    except OSError:
        return False


async def get_batch(cache_key: str) -> dict | None:
    target = path(cache_key, '.json')

    def read():
        if target is None:
            return None
        try:
            if target.stat().st_size > 20 * 1024 * 1024:
                return None
            value = json.loads(target.read_bytes())
            return value if isinstance(value, dict) else None
        except (OSError, ValueError):
            return None

    return await asyncio.to_thread(read)


async def put_batch(cache_key: str, body: dict) -> bool:
    target = path(cache_key, '.json')
    data = json.dumps(body).encode()
    if target is None or len(data) > 20 * 1024 * 1024:
        return False
    try:
        return await asyncio.to_thread(_write, target, data)
    except OSError:
        return False


@contextlib.asynccontextmanager
async def lease(cache_key: str):
    target = path(cache_key, '.lock')
    if target is None:
        yield
        return

    def open_lock():
        target.parent.mkdir(parents=True, exist_ok=True)
        return target.open('a+b')

    try:
        handle = await asyncio.to_thread(open_lock)
    except OSError:
        # A read-only/missing disk must not prevent the API's memory-cache fallback.
        yield
        return
    try:
        deadline = time.monotonic() + 180
        while True:
            try:
                await asyncio.to_thread(fcntl.flock, handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= deadline:
                    raise TimeoutError('Voice asset busy') from None
                await asyncio.sleep(0.05)
        yield
    finally:
        await asyncio.to_thread(handle.close)
