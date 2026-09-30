"""Release trust and failure-order tests without touching Docker or a live database."""

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import check_release_ci

REPO = Path(__file__).resolve().parents[1]
SHA = "a" * 40
IMAGE = "ghcr.io/owner/dungeon-master-backend@sha256:" + "b" * 64
spec = importlib.util.spec_from_file_location(
    "check_release", REPO / "deploy/check-release.py"
)
check_release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check_release)


class PublicReleaseTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.frontend = Path(directory.name)
        files = {
            "index.html": b"<html>application</html>",
            "release.txt": (SHA + "\n").encode(),
            "assets/app.js": b"console.log('app')",
            "mediapipe/wasm/model.wasm": b"wasm-fixture",
            "models/pose.task": b"model-fixture",
        }
        for name, data in files.items():
            file = self.frontend / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(data)
        self.fault = ""
        fixture = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_GET(self):
                status, kind, data = 200, "application/octet-stream", b""
                if self.path == "/api/v1/ready":
                    kind = "application/json"
                    data = b'{"status":"ok","database":"reachable"}'
                elif self.path == "/api/v1/health":
                    kind, data = "application/json", b'{"status":"ok"}'
                elif self.path.startswith("/api/"):
                    status = 401 if self.path.endswith("/profile") else 404
                    kind, data = "application/json", b'{"detail":"fixture"}'
                    if fixture.fault == "api-html":
                        kind, data = "text/html", files["index.html"]
                elif self.path[1:] in files:
                    data = files[self.path[1:]]
                    if self.path.endswith(".wasm"):
                        kind = (
                            "text/html" if fixture.fault == "wasm-mime" else "application/wasm"
                        )
                    if self.path.endswith(".js") and fixture.fault == "stale-asset":
                        data = b"stale javascript"
                elif "missing" in self.path:
                    status = 200 if fixture.fault == "missing-fallback" else 404
                    kind, data = "text/html", files["index.html"]
                else:
                    kind, data = "text/html", files["index.html"]
                self.send_response(status)
                self.send_header("Content-Type", kind)
                if fixture.fault == "cached-html" and kind == "text/html":
                    self.send_header("Cache-Control", "immutable")
                self.end_headers()
                self.wfile.write(data)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.close_server)
        self.origin = f"http://127.0.0.1:{self.server.server_port}"

    def close_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def test_valid_public_delivery_passes(self):
        check_release.check(self.origin, self.frontend, SHA)

    def test_api_spa_fallback_stale_assets_wrong_wasm_mime_and_html_caching_fail(self):
        for fault in [
            "api-html",
            "stale-asset",
            "wasm-mime",
            "missing-fallback",
            "cached-html",
        ]:
            with self.subTest(fault=fault):
                self.fault = fault
                with self.assertRaises(ValueError):
                    check_release.check(self.origin, self.frontend, SHA)

    def test_wrong_deployed_sha_fails(self):
        with self.assertRaisesRegex(ValueError, "SHA"):
            check_release.check(self.origin, self.frontend, "c" * 40)


class ReleaseTrustTests(unittest.TestCase):
    def setUp(self):
        self.run = {
            "id": 123,
            "head_sha": SHA,
            "head_branch": "main",
            "head_repository": {"full_name": "owner/repo"},
            "path": ".github/workflows/ci.yml",
            "event": "push",
            "conclusion": "success",
        }
        self.jobs = [
            {"name": name, "conclusion": "success"} for name in check_release_ci.REQUIRED_JOBS
        ]
        self.status = "identical"
        self.addCleanup(patch.stopall)
        patch.dict(os.environ, {"GITHUB_REPOSITORY": "owner/repo"}).start()
        self.api = patch.object(check_release_ci, "github", side_effect=self.github).start()

    def github(self, path):
        if path.startswith("compare/"):
            return {"status": self.status}
        if path.endswith("/jobs?filter=latest&per_page=100"):
            return {"jobs": self.jobs}
        if path.startswith("actions/runs/"):
            return self.run
        return {"workflow_runs": [self.run]}

    def test_exact_push_ci_and_manual_ci_are_accepted(self):
        self.assertEqual(check_release_ci.verify(SHA, "main", "123"), SHA)
        self.run["event"] = "workflow_dispatch"
        self.assertEqual(check_release_ci.verify(SHA, "main"), SHA)

    def test_branch_name_is_not_a_release_sha(self):
        with self.assertRaises(ValueError):
            check_release_ci.verify("main", "main")
        self.api.assert_not_called()

    def test_pr_fork_wrong_sha_wrong_branch_and_wrong_workflow_are_rejected(self):
        for field, value in [
            ("event", "pull_request"),
            ("head_sha", "c" * 40),
            ("head_branch", "feature"),
            ("path", ".github/workflows/other.yml"),
            ("head_repository", {"full_name": "fork/repo"}),
            ("conclusion", "failure"),
        ]:
            with self.subTest(field=field):
                original = self.run[field]
                self.run[field] = value
                with self.assertRaises(ValueError):
                    check_release_ci.verify(SHA, "main")
                self.run[field] = original

    def test_successful_workflow_with_skipped_required_job_is_rejected(self):
        for job in self.jobs:
            for conclusion in ["failure", "cancelled", "skipped", None]:
                with self.subTest(job=job["name"], conclusion=conclusion):
                    job["conclusion"] = conclusion
                    with self.assertRaises(ValueError):
                        check_release_ci.verify(SHA, "main")
                    job["conclusion"] = "success"

    def test_current_pipeline_requires_successful_ci_and_smoke_before_cd(self):
        self.run.update(status="in_progress", conclusion=None)
        with patch.dict(os.environ, {"GITHUB_RUN_ID": "123"}):
            self.assertEqual(check_release_ci.verify(SHA, "main", "123"), SHA)
            for job in self.jobs:
                with self.subTest(job=job["name"]):
                    job["conclusion"] = "failure"
                    with self.assertRaises(ValueError):
                        check_release_ci.verify(SHA, "main", "123")
                    job["conclusion"] = "success"

    def test_other_running_workflow_cannot_authorize_cd(self):
        self.run.update(status="in_progress", conclusion=None)
        with patch.dict(os.environ, {"GITHUB_RUN_ID": "456"}):
            with self.assertRaises(ValueError):
                check_release_ci.verify(SHA, "main", "123")
            with self.assertRaises(ValueError):
                check_release_ci.verify(SHA, "main")

    def test_commit_outside_trusted_branch_is_rejected(self):
        self.status = "diverged"
        with self.assertRaises(ValueError):
            check_release_ci.verify(SHA, "main")
        self.assertEqual(self.api.call_count, 1)


MOCK_TOOL = r"""
import json
import os
import sys
from pathlib import Path

tool = Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ["DEPLOY_TEST_LOG"], "a") as log:
    log.write(json.dumps([tool, *args]) + "\n")
if tool == "docker":
    if args[0] == "login":
        sys.stdin.read()
    if any("pg_dump" in arg for arg in args):
        if os.getenv("DEPLOY_TEST_FAILURE") != "backup":
            print("fixture-custom-format-backup")
    failure = os.getenv("DEPLOY_TEST_FAILURE")
    if failure == "migration" and "upgrade" in args:
        sys.exit(1)
    if failure == "restore" and any("pg_restore" in arg for arg in args):
        sys.exit(1)
elif tool == "python3":
    if args[0].endswith("check-release.py"):
        sys.exit(1 if os.getenv("DEPLOY_TEST_FAILURE") == "smoke" else 0)
    os.execv(sys.executable, [sys.executable, *args])
elif tool == "mv":
    os.replace(args[-2], args[-1])
"""


class ServerDeploymentTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.directory = Path(directory.name).resolve()
        self.root = self.directory / "app"
        self.bundle = self.root / "incoming" / (SHA + "-123-1")
        self.bundle.mkdir(parents=True)
        shutil.copytree(REPO / "deploy", self.bundle / "deploy")
        (self.bundle / "release.txt").write_text(SHA + "\n")
        (self.bundle / "backend-image.txt").write_text(IMAGE + "\n")
        (self.bundle / "frontend/assets").mkdir(parents=True)
        (self.bundle / "frontend/assets/new.js").write_text("new app")
        (self.bundle / "frontend/index.html").write_text("new index")
        self.old = self.root / "frontend/releases/old"
        (self.old / "assets").mkdir(parents=True)
        (self.old / "assets/old.js").write_text("old app")
        (self.root / "frontend/current").symlink_to(self.old)
        (self.root / "frontend/assets").mkdir()
        (self.root / "frontend/assets/old.js").write_text("old app")
        (self.root / "deployed.json").write_text('{"sha":"old"}')
        self.runtime = self.directory / "runtime.env"
        self.runtime.write_text("POSTGRES_USER=fixture\n")
        self.log = self.directory / "commands.jsonl"
        binary = self.directory / "bin"
        binary.mkdir()
        for name in ["docker", "curl", "python3", "mv", "flock"]:
            tool = binary / name
            tool.write_text(f"#!{sys.executable}\n" + MOCK_TOOL)
            tool.chmod(0o755)
        self.env = {
            **os.environ,
            "PATH": str(binary) + os.pathsep + os.environ["PATH"],
            "RUNTIME_ENV_FILE": str(self.runtime),
            "DEPLOY_TEST_LOG": str(self.log),
        }

    def run_deploy(self, action="prepare", failure=""):
        return subprocess.run(
            [
                "bash",
                str(self.bundle / "deploy/deploy.sh"),
                action,
                str(self.bundle),
                str(self.root),
                "https://fitness.example",
                "registry-user",
            ],
            input="ephemeral-fixture-token\n",
            text=True,
            capture_output=True,
            env={**self.env, "DEPLOY_TEST_FAILURE": failure},
            timeout=15,
        )

    def commands(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_success_orders_backup_restore_migration_and_publication(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        commands = [" ".join(command) for command in self.commands()]
        backup = next(i for i, command in enumerate(commands) if "pg_dump" in command)
        restore = next(i for i, command in enumerate(commands) if "pg_restore" in command)
        migrate = next(i for i, command in enumerate(commands) if "upgrade head" in command)
        publish = next(i for i, command in enumerate(commands) if "current.next" in command)
        self.assertLess(backup, restore)
        self.assertLess(restore, migrate)
        self.assertLess(migrate, publish)
        self.assertTrue((self.root / "frontend/assets/old.js").exists())
        self.assertTrue((self.root / "frontend/assets/new.js").exists())
        self.assertEqual(json.loads((self.root / "deployed.json").read_text())["sha"], "old")
        self.assertTrue((self.root / "pending").is_symlink())
        self.assertFalse(list(self.root.rglob("docker-auth")))
        result = self.run_deploy("complete")
        self.assertEqual(result.returncode, 0, result.stderr)
        state = json.loads((self.root / "deployed.json").read_text())
        self.assertEqual(state["sha"], SHA)
        self.assertEqual(state["image"], IMAGE)
        self.assertFalse((self.root / "pending").exists())
        self.assertEqual(json.loads((self.root / "previous.json").read_text())["sha"], "old")

    def test_failed_backup_restore_and_migration_preserve_live_frontend(self):
        for failure in ["backup", "restore", "migration"]:
            with self.subTest(failure=failure):
                if failure != "backup":
                    shutil.rmtree(self.root / "backend/releases")
                result = self.run_deploy(failure=failure)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual((self.root / "frontend/current").resolve(), self.old)
                self.assertFalse((self.root / "pending").exists())
                self.assertEqual(
                    json.loads((self.root / "deployed.json").read_text())["sha"], "old"
                )

    def test_failed_public_smoke_restores_previous_frontend(self):
        result = self.run_deploy(failure="smoke")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "frontend/current").resolve(), self.old)
        self.assertFalse((self.root / "pending").exists())

    def test_failed_browser_smoke_can_abort_without_marking_success(self):
        self.assertEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.run_deploy("abort").returncode, 0)
        self.assertEqual((self.root / "frontend/current").resolve(), self.old)
        self.assertEqual(json.loads((self.root / "deployed.json").read_text())["sha"], "old")

    def test_unfinished_release_blocks_other_deployments(self):
        self.assertEqual(self.run_deploy().returncode, 0)
        result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unfinished release", result.stderr)
        self.assertTrue((self.root / "pending").exists())

    def test_no_destructive_or_cross_project_docker_commands(self):
        self.assertEqual(self.run_deploy().returncode, 0)
        for command in self.commands():
            if command[:2] != ["docker", "compose"]:
                continue
            self.assertIn("dungeon-master", command)
            self.assertFalse({"down", "prune", "stop", "--volumes"} & set(command))


if __name__ == "__main__":
    unittest.main()
