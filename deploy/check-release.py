#!/usr/bin/env python3
"""Check deployed HTTPS routes, API behavior and every shipped asset's bytes."""

import hashlib
import json
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def fetch(origin, path, expected_status=200, *, method="GET", headers=None):
    try:
        response = urlopen(
            Request(origin + path, method=method, headers=headers or {}), timeout=30
        )
    except HTTPError as error:
        response = error
    with response:
        if response.status != expected_status:
            raise ValueError(f"Unexpected status for {path}: {response.status}")
        if not response.url.startswith(origin + "/"):
            raise ValueError(f"Unexpected redirect for {path}")
        return response.headers, response.read()


def check_api(origin, cors_origins=()):
    headers, data = fetch(origin, "/api/v1/ready")
    if json.loads(data) != {"status": "ok", "database": "reachable"}:
        raise ValueError("Database readiness failed")
    fetch(origin, "/api/v1/health")
    for path, status in [("/api/v1/profile", 401), ("/api/v1/not-a-route", 404)]:
        headers, data = fetch(origin, path, status)
        if "application/json" not in headers.get("Content-Type", ""):
            raise ValueError(f"API returned SPA HTML for {path}")
        json.loads(data)
    for frontend_origin in cors_origins:
        headers, _ = fetch(
            origin,
            "/api/v1/auth/guest",
            method="OPTIONS",
            headers={
                "Origin": frontend_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        allowed_headers = {
            value.strip().lower()
            for value in headers.get("Access-Control-Allow-Headers", "").split(",")
        }
        allowed_methods = {
            value.strip()
            for value in headers.get("Access-Control-Allow-Methods", "").split(",")
        }
        if (
            headers.get("Access-Control-Allow-Origin") != frontend_origin
            or headers.get("Access-Control-Allow-Credentials") != "true"
            or "POST" not in allowed_methods
            or not {"authorization", "content-type"} <= allowed_headers
        ):
            raise ValueError(f"API preflight failed for {frontend_origin}")
        headers, _ = fetch(origin, "/api/v1/ready", headers={"Origin": frontend_origin})
        if headers.get("Access-Control-Allow-Origin") != frontend_origin:
            raise ValueError(f"API response CORS failed for {frontend_origin}")


def check(origin, frontend, sha, api_only=False):
    check_api(origin)
    if fetch(origin, "/release.txt")[1].decode().strip() != sha:
        raise ValueError("Wrong deployed release SHA")
    if api_only:
        for path in ["/", "/context", "/plan", "/assets/missing.js", "/models/missing.task"]:
            fetch(origin, path, 404)
        print("HTTPS, release SHA, API readiness/auth/errors and API-only hosting passed.")
        return
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
    if sys.argv[1] == "--api-health":
        check_api(sys.argv[2].rstrip("/"), sys.argv[3:])
        print("API readiness, auth/errors and configured frontend CORS passed.")
    else:
        check(
            sys.argv[1].rstrip("/"),
            Path(sys.argv[2]),
            sys.argv[3],
            api_only="--api-only" in sys.argv[4:],
        )
