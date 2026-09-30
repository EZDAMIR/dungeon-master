#!/usr/bin/env python3
"""Check deployed HTTPS routes, API behavior and every shipped asset's bytes."""

import hashlib
import json
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen


def fetch(origin, path, expected_status=200):
    try:
        response = urlopen(origin + path, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        if response.status != expected_status:
            raise ValueError(f"Unexpected status for {path}: {response.status}")
        if not response.url.startswith(origin + "/"):
            raise ValueError(f"Unexpected redirect for {path}")
        return response.headers, response.read()


def check(origin, frontend, sha):
    headers, data = fetch(origin, "/api/v1/ready")
    if json.loads(data) != {"status": "ok", "database": "reachable"}:
        raise ValueError("Database readiness failed")
    fetch(origin, "/api/v1/health")
    for path, status in [("/api/v1/profile", 401), ("/api/v1/not-a-route", 404)]:
        headers, data = fetch(origin, path, status)
        if "application/json" not in headers.get("Content-Type", ""):
            raise ValueError(f"API returned SPA HTML for {path}")
        json.loads(data)
    if fetch(origin, "/release.txt")[1].decode().strip() != sha:
        raise ValueError("Wrong deployed frontend SHA")
    index = (frontend / "index.html").read_bytes()
    for route in [
        "/",
        "/context",
        "/context/documents",
        "/context/review",
        "/plan",
        "/progress",
        "/workout",
        "/results",
    ]:
        headers, data = fetch(origin, route)
        if data != index or "immutable" in headers.get("Cache-Control", ""):
            raise ValueError(f"Wrong SPA fallback or HTML caching for {route}")
    for file in frontend.rglob("*"):
        if not file.is_file() or file.name == "index.html":
            continue
        path = "/" + file.relative_to(frontend).as_posix()
        headers, data = fetch(origin, path)
        if hashlib.sha256(data).digest() != hashlib.sha256(file.read_bytes()).digest():
            raise ValueError(f"Wrong asset bytes for {path}")
        content_type = headers.get("Content-Type", "")
        if file.suffix == ".wasm" and content_type != "application/wasm":
            raise ValueError(f"Wrong WASM Content-Type for {path}")
        if file.suffix in {".js", ".css", ".svg", ".woff2"} and "text/html" in content_type:
            raise ValueError(f"Asset returned HTML for {path}")
    for path in ["/models/missing.task", "/mediapipe/wasm/missing.wasm", "/assets/missing.js"]:
        fetch(origin, path, 404)
    print("HTTPS, readiness, API auth/errors, SPA routes and all asset bytes passed.")


if __name__ == "__main__":
    check(sys.argv[1].rstrip("/"), Path(sys.argv[2]), sys.argv[3])
