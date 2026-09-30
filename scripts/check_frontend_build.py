#!/usr/bin/env python3
"""Verify a production preview serves actual assets under the requested base."""

import argparse
import contextlib
import hashlib
import os
import re
import signal
import socket
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen

MODEL_CHECKSUMS = {
    "gesture_recognizer.task": "97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482",
    "pose_landmarker_lite.task": "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
}


def verify_build(frontend: Path, origin: str, base: str) -> None:
    def fetch(path: str) -> bytes:
        with urlopen(origin + path, timeout=10) as response:
            if response.status != 200:
                raise AssertionError(f"Unexpected HTTP status for {path}")
            return response.read()

    html = fetch(base).decode()
    assets = re.findall(r'(?:src|href)="(/[^" ]+)"', html)
    if not any(path.endswith(".js") for path in assets):
        raise AssertionError("Preview did not expose a production script")
    for path in assets:
        if not path.startswith(base):
            raise AssertionError(f"Asset does not use the configured base: {path}")
        relative = path[len(base) :]
        expected = (frontend / "dist" / relative).read_bytes()
        if fetch(path) != expected:
            raise AssertionError(f"Wrong production asset bytes: {path}")
    for name, checksum in MODEL_CHECKSUMS.items():
        if hashlib.sha256(fetch(base + "models/" + name)).hexdigest() != checksum:
            raise AssertionError(f"Wrong model checksum: {name}")
    wasm_files = list((frontend / "node_modules/@mediapipe/tasks-vision/wasm").iterdir())
    if len(wasm_files) != 6:
        raise AssertionError("Expected six installed MediaPipe WASM assets")
    for path in wasm_files:
        if fetch(base + "mediapipe/wasm/" + path.name) != path.read_bytes():
            raise AssertionError(f"Wrong WASM asset bytes: {path.name}")
    bundle = "".join(path.read_text() for path in (frontend / "dist/assets").glob("*.js"))
    for label in [
        "Stable calibration / countdown",
        "Wrong camera angle",
        "Body cropped",
        "Correct rep",
    ]:
        if label in bundle:
            raise AssertionError(f"Development fake controls in production: {label}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="/")
    args = parser.parse_args()
    if not args.base.startswith("/") or not args.base.endswith("/"):
        parser.error("base must start and end with /")
    frontend = Path(__file__).resolve().parents[1] / "frontend"
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    origin = f"http://127.0.0.1:{port}"
    with tempfile.TemporaryFile(mode="w+") as log:
        process = subprocess.Popen(
            [
                "npm",
                "run",
                "preview",
                "--",
                "--base=" + args.base,
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--strictPort",
            ],
            cwd=frontend,
            stdout=log,
            stderr=log,
            start_new_session=True,
        )
        try:
            deadline = time.monotonic() + 20
            while True:
                if process.poll() is not None:
                    log.seek(0)
                    raise RuntimeError("Preview exited before verification: " + log.read())
                try:
                    with urlopen(origin + args.base, timeout=1):
                        break
                except OSError:
                    if time.monotonic() >= deadline:
                        raise RuntimeError("Production preview did not start") from None
                    time.sleep(0.1)
            verify_build(frontend, origin, args.base)
            print(
                f"Production preview {args.base}: scripts/styles, two model checksums, six WASM files and fake-control exclusion passed."
            )
        finally:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                with contextlib.suppress(ProcessLookupError):
                    os.killpg(process.pid, signal.SIGKILL)
                process.wait()


if __name__ == "__main__":
    main()
