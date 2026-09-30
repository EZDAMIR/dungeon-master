"""Protect the backend instruction map and its local navigation links."""

import hashlib
import json
import re
import runpy
from pathlib import Path

import pytest

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPOSITORY_ROOT / 'backend'
LAYER_GUIDES = (
    'src/CLAUDE.md',
    'src/api/CLAUDE.md',
    'src/api/controllers/CLAUDE.md',
    'src/api/models/CLAUDE.md',
    'src/api/schemas/CLAUDE.md',
    'src/api/services/CLAUDE.md',
    'src/api/v1/endpoints/CLAUDE.md',
    'src/api/webhooks/CLAUDE.md',
    'src/migrations/postgres/CLAUDE.md',
)


def test_complete_starter_guides_match_recorded_source():
    manifest = json.loads((BACKEND_ROOT / 'docs/starter-instructions.json').read_text())
    assert manifest['repository'] == 'https://github.com/EZDAMIR/fastapi-backend-starter'
    assert re.fullmatch(r'[0-9a-f]{40}', manifest['revision'])
    assert set(manifest['files']) == set(LAYER_GUIDES)
    for relative_path, expected in manifest['files'].items():
        guide = BACKEND_ROOT / relative_path
        actual = hashlib.sha256(guide.read_bytes()).hexdigest()
        assert actual == expected, f'Upstream guide changed or truncated: {relative_path}'


def test_backend_layer_instruction_map_and_links():
    instruction_map = (BACKEND_ROOT / 'CLAUDE.md').read_text()
    for relative_path in LAYER_GUIDES:
        guide = BACKEND_ROOT / relative_path
        assert guide.is_file(), f'Missing layer instructions: {relative_path}'
        assert f']({relative_path})' in instruction_map, relative_path

    guides = [BACKEND_ROOT / 'CLAUDE.md', *(BACKEND_ROOT / 'src').rglob('CLAUDE.md')]
    for guide in guides:
        for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', guide.read_text()):
            if '://' in target or target.startswith('#'):
                continue
            destination = (guide.parent / target.split('#')[0]).resolve()
            assert destination.is_relative_to(REPOSITORY_ROOT), (guide, target)
            assert destination.is_file(), f'Broken instruction link in {guide}: {target}'


@pytest.mark.parametrize('relative_path', LAYER_GUIDES)
def test_architecture_verifier_reports_missing_backend_guide(
    relative_path, monkeypatch, capsys
):
    verifier = REPOSITORY_ROOT / 'scripts' / 'verify_architecture.py'
    namespace = runpy.run_path(str(verifier))
    missing = BACKEND_ROOT / relative_path
    original_is_file = Path.is_file

    def is_file(path):
        return False if path == missing else original_is_file(path)

    monkeypatch.setattr(Path, 'is_file', is_file)
    assert namespace['main']() == 1
    output = capsys.readouterr().out
    assert 'Missing required files:' in output
    assert f'backend/{relative_path}' in output
