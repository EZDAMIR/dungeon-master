# Vision Agent Entry

Canonical rules are in `CLAUDE.md` in this directory and
`../../../docs/VISION_PIPELINE.md`.

Before editing visual logic:

1. Identify the exact semantic event or exercise rule being changed.
2. Add or update a landmark fixture.
3. Write a failing pure unit test.
4. Change the smallest pure module.
5. Run vision tests and the frontend type check.
6. Verify that no network or React dependency entered the visual core.
