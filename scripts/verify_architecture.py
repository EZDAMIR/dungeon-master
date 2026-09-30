#!/usr/bin/env python3
"""Verify that the Dungeon Master architecture scaffold is present."""

from __future__ import annotations

import sys
from pathlib import Path


REQUIRED_FILES = (
    Path("README.md"),
    Path("CLAUDE.md"),
    Path("AGENTS.md"),
    Path("AGENT.md"),
    Path("AGENT_PROMPT.md"),
    Path("docs/ARCHITECTURE.md"),
    Path("docs/PROJECT_STRUCTURE.md"),
    Path("docs/DOMAIN_MODEL.md"),
    Path("docs/API_CONTRACT.md"),
    Path("docs/VISION_PIPELINE.md"),
    Path("docs/IMPLEMENTATION_PLAN.md"),
    Path("docs/TEST_STRATEGY.md"),
    Path("docs/HACKATHON_CHECKLIST.md"),
    Path("frontend/CLAUDE.md"),
    Path("frontend/AGENTS.md"),
    Path("frontend/src/vision/CLAUDE.md"),
    Path("frontend/src/vision/AGENTS.md"),
    Path("backend/CLAUDE.md"),
    Path("backend/AGENTS.md"),
    Path("backend/src/ai/CLAUDE.md"),
    Path("backend/src/CLAUDE.md"),
    Path("backend/src/api/CLAUDE.md"),
    Path("backend/src/api/controllers/CLAUDE.md"),
    Path("backend/src/api/models/CLAUDE.md"),
    Path("backend/src/api/schemas/CLAUDE.md"),
    Path("backend/src/api/services/CLAUDE.md"),
    Path("backend/src/api/v1/endpoints/CLAUDE.md"),
    Path("backend/src/api/webhooks/CLAUDE.md"),
    Path("backend/src/migrations/postgres/CLAUDE.md"),
    Path("backend/pyproject.toml"),
    Path("backend/src/main.py"),
)

REQUIRED_DIRECTORIES = (
    Path("frontend/public/models"),
    Path("frontend/public/audio"),
    Path("frontend/src/app"),
    Path("frontend/src/pages"),
    Path("frontend/src/features/gesture-navigation"),
    Path("frontend/src/features/workout"),
    Path("frontend/src/vision/core"),
    Path("frontend/src/vision/gestures"),
    Path("frontend/src/vision/pose"),
    Path("frontend/src/vision/exercises/squat"),
    Path("frontend/src/vision/feedback"),
    Path("frontend/src/audio"),
    Path("frontend/src/api"),
    Path("backend/src/ai/prompts"),
    Path("backend/tests/fixtures"),
)


def main() -> int:
    root = Path(__file__).resolve().parents[1]

    missing_files = [path for path in REQUIRED_FILES if not (root / path).is_file()]
    missing_dirs = [path for path in REQUIRED_DIRECTORIES if not (root / path).is_dir()]

    if missing_files:
        print("Missing required files:")
        for path in missing_files:
            print(f"  - {path}")

    if missing_dirs:
        print("Missing required directories:")
        for path in missing_dirs:
            print(f"  - {path}")

    if missing_files or missing_dirs:
        return 1

    print("Dungeon Master architecture scaffold is complete.")
    print("This verifies structure only, not feature implementation.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
