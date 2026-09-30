"""ElevenLabs timed synthesis and validated MP3 segmentation for fixed cue packs."""

import asyncio
import base64
import binascii
import math
import pathlib
import subprocess
import tempfile

from ..core import config
from ..core import voice_assets
from . import elevenlabs


async def render(voice: str, texts: list[str], language: str, style: str, model: str) -> dict:
    text = '\n'.join(elevenlabs.delivery_text(value, style, model) for value in texts)
    if model != 'eleven_v4' or not 1 <= len(text) <= 10000:
        raise elevenlabs.SpeechUnavailable('batch_config')
    try:
        body = (
            await elevenlabs.request(
                'POST',
                '/v1/text-to-speech/' + voice + '/with-timestamps',
                timeout=config.get_settings().ELEVENLABS_BATCH_TIMEOUT_SECONDS,
                params={'output_format': config.get_settings().ELEVENLABS_OUTPUT_FORMAT},
                json={
                    'text': text,
                    'model_id': model,
                    'language_code': language,
                    'voice_settings': elevenlabs.voice_settings(style),
                },
            )
        ).json()
        # Keep the paid response even if segmentation later needs repair.
        if not isinstance(body, dict) or not voice_assets.valid_audio(
            base64.b64decode(body['audio_base64'], validate=True)
        ):
            raise ValueError
        return body
    except (KeyError, ValueError, TypeError) as exc:
        raise elevenlabs.SpeechUnavailable('batch_schema') from exc


def boundaries(body: dict, texts: list[str]) -> tuple[bytes, list[tuple[float, float]]]:
    try:
        audio = base64.b64decode(body['audio_base64'], validate=True)
        if not voice_assets.valid_audio(audio):
            raise ValueError
        for alignment in (body.get('alignment'), body.get('normalized_alignment')):
            if not isinstance(alignment, dict):
                continue
            characters = alignment.get('characters', [])
            starts = alignment.get('character_start_times_seconds', [])
            ends = alignment.get('character_end_times_seconds', [])
            if not characters or not len(characters) == len(starts) == len(ends):
                continue
            if not all(
                isinstance(start, (int, float))
                and isinstance(end, (int, float))
                and math.isfinite(start)
                and math.isfinite(end)
                and 0 <= start <= end
                for start, end in zip(starts, ends, strict=True)
            ) or any(a > b for a, b in zip(starts, starts[1:], strict=False)):
                continue
            combined = ''.join(characters)
            cursor, spans = 0, []
            for text in texts:
                spoken = text.strip().rstrip('.!?…')
                index = combined.find(spoken, cursor)
                if index < 0:
                    break
                last = index + len(spoken) - 1
                spans.append((starts[index], ends[last]))
                cursor = last + 1
            if len(spans) != len(texts) or any(end <= start for start, end in spans):
                continue
            if any(a[1] > b[0] for a, b in zip(spans, spans[1:], strict=False)):
                continue
            # Padding stays inside the gap between adjacent cues, never another word.
            padded = [
                (
                    max(0, start - 0.08, (spans[i - 1][1] + start) / 2 if i else 0),
                    min(end + 0.12, (end + spans[i + 1][0]) / 2)
                    if i + 1 < len(spans)
                    else end + 0.12,
                )
                for i, (start, end) in enumerate(spans)
            ]
            return audio, padded
        raise ValueError
    except (KeyError, ValueError, TypeError, binascii.Error) as exc:
        raise elevenlabs.SpeechUnavailable('batch_alignment') from exc


async def split(body: dict, texts: list[str]) -> list[bytes]:
    audio, spans = boundaries(body, texts)

    def process():
        with tempfile.TemporaryDirectory(prefix='dm-voice-') as root:
            source = pathlib.Path(root) / 'source.mp3'
            source.write_bytes(audio)
            clips = []
            for index, (start, end) in enumerate(spans):
                target = pathlib.Path(root) / f'{index}.mp3'
                subprocess.run(
                    [
                        'ffmpeg',
                        '-nostdin',
                        '-loglevel',
                        'error',
                        '-i',
                        str(source),
                        '-ss',
                        str(start),
                        '-t',
                        str(end - start),
                        '-codec:a',
                        'libmp3lame',
                        '-b:a',
                        '128k',
                        str(target),
                    ],
                    check=True,
                    timeout=30,
                    capture_output=True,
                )
                data = target.read_bytes()
                if not voice_assets.valid_audio(data):
                    raise elevenlabs.SpeechUnavailable('invalid_audio')
                clips.append(data)
            return clips

    try:
        return await asyncio.to_thread(process)
    except (OSError, subprocess.SubprocessError) as exc:
        raise elevenlabs.SpeechUnavailable('audio_split') from exc
