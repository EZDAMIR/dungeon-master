# Agent compatibility entrypoint

This repository uses `AGENTS.md` as the canonical general-agent instruction file
and `CLAUDE.md` for Claude-specific repository guidance.

Before editing:

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. Read the architecture documents under `docs/`.
4. Read every nearer `AGENTS.md` or `CLAUDE.md` file for the directory you touch.
5. Preserve the existing backend instruction files; never overwrite them during
   scaffolding.

Start with Phase 0 in `AGENT_PROMPT.md` unless the user explicitly names another
phase.
