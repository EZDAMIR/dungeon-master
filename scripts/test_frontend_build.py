"""Exercise asset validation against real HTTP responses and SPA fallbacks."""

import functools
import hashlib
import tempfile
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import check_frontend_build


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class ProductionAssetTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.frontend = Path(self.directory.name)
        self.dist = self.frontend / "dist"
        self.dist.mkdir()
        self.wasm = self.frontend / "node_modules/@mediapipe/tasks-vision/wasm"
        self.wasm.mkdir(parents=True)
        self.checksums = {}
        for name in ["gesture_recognizer.task", "pose_landmarker_lite.task"]:
            data = ("fixture:" + name).encode()
            self.checksums[name] = hashlib.sha256(data).hexdigest()
            self.write("models/" + name, data)
        for i in range(6):
            data = f"wasm-{i}".encode()
            (self.wasm / f"asset-{i}.wasm").write_bytes(data)
            self.write(f"mediapipe/wasm/asset-{i}.wasm", data)
        self.write("assets/app.js", b"console.log('production')")
        self.write("assets/app.css", b"body { margin: 0 }")
        self.write(
            "index.html",
            b'<script src="/assets/app.js"></script><link href="/assets/app.css">',
        )
        handler = functools.partial(QuietHandler, directory=str(self.dist))
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.close_server)
        self.origin = f"http://127.0.0.1:{self.server.server_port}"
        self.addCleanup(patch.stopall)
        patch.dict(check_frontend_build.MODEL_CHECKSUMS, self.checksums, clear=True).start()

    def close_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def write(self, path, data):
        target = self.dist / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    def test_valid_root_and_subdirectory_delivery(self):
        check_frontend_build.verify_build(self.frontend, self.origin, "/")
        (self.dist / "dungeon-master").symlink_to(self.dist, target_is_directory=True)
        self.write("index.html", b'<script src="/dungeon-master/assets/app.js"></script>')
        check_frontend_build.verify_build(self.frontend, self.origin, "/dungeon-master/")

    def test_html_fallback_for_model_is_rejected(self):
        self.write(
            "models/gesture_recognizer.task", b"<!doctype html><html>SPA fallback</html>"
        )
        with self.assertRaisesRegex(AssertionError, "Wrong model checksum"):
            check_frontend_build.verify_build(self.frontend, self.origin, "/")

    def test_stale_wasm_is_rejected(self):
        self.write("mediapipe/wasm/asset-0.wasm", b"stale WASM")
        with self.assertRaisesRegex(AssertionError, "Wrong WASM asset bytes"):
            check_frontend_build.verify_build(self.frontend, self.origin, "/")

    def test_root_assets_in_subdirectory_build_are_rejected(self):
        (self.dist / "dungeon-master").symlink_to(self.dist, target_is_directory=True)
        with self.assertRaisesRegex(AssertionError, "configured base"):
            check_frontend_build.verify_build(self.frontend, self.origin, "/dungeon-master/")

    def test_fake_controls_in_bundle_are_rejected(self):
        self.write("assets/app.js", b"console.log('Wrong camera angle')")
        with self.assertRaisesRegex(AssertionError, "fake controls in production"):
            check_frontend_build.verify_build(self.frontend, self.origin, "/")


if __name__ == "__main__":
    unittest.main()
