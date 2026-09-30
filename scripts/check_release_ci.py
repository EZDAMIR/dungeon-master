#!/usr/bin/env python3
"""Allow only branch-owned commits with all required CI jobs passing."""

import json
import os
import re
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

REQUIRED_JOBS = {"CI (Back)", "CI (Front)", "Smoke tests"}


def github(path):
    request = Request(
        "https://api.github.com/repos/" + os.environ["GITHUB_REPOSITORY"] + "/" + path,
        headers={
            "Authorization": "Bearer " + os.environ["GH_TOKEN"],
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def verify(sha, branch, run_id=""):
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Release must be a full lowercase commit SHA")
    comparison = github(f"compare/{sha}...{quote(branch, safe='')}")
    if comparison["status"] not in {"ahead", "identical"}:
        raise ValueError("Release is not part of the configured trusted branch")
    if run_id:
        runs = [github(f"actions/runs/{int(run_id)}")]
    else:
        runs = github(f"actions/workflows/ci.yml/runs?head_sha={sha}&per_page=100")[
            "workflow_runs"
        ]
    for run in runs:
        if (
            run["head_sha"] != sha
            or run["head_branch"] != branch
            or run["head_repository"]["full_name"] != os.environ["GITHUB_REPOSITORY"]
            or run["path"] != ".github/workflows/ci.yml"
            or run["event"] not in {"push", "workflow_dispatch"}
        ):
            continue
        # In the shared pipeline, CI and smoke have completed but CD is still
        # running. Only that exact current run may bypass whole-run completion.
        current_run = str(run["id"]) == run_id == os.getenv("GITHUB_RUN_ID")
        if run["conclusion"] != "success" and not (
            current_run and run.get("status") == "in_progress" and run["conclusion"] is None
        ):
            continue
        jobs = github(f"actions/runs/{run['id']}/jobs?filter=latest&per_page=100")["jobs"]
        passed = {job["name"] for job in jobs if job["conclusion"] == "success"}
        if passed >= REQUIRED_JOBS:
            return sha
    raise ValueError("No successful backend/frontend/Docker CI for this branch and exact SHA")


if __name__ == "__main__":
    release = verify(
        os.environ["RELEASE_SHA"], os.environ["DEPLOY_BRANCH"], os.getenv("CI_RUN_ID", "")
    )
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
        output.write(f"sha={release}\n")
    print(f"Verified release {release}")
