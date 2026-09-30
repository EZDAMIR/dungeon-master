# Sprint 4A Figma assets

Extends [public guide](../CLAUDE.md). These SVGs come from the existing Motion Studio handoff.
Fonts are from Google Fonts under their accompanying OFL licenses.
Never use whole-screen screenshots as UI assets. Preserve SVG root dimensions.

Example from the header consumer:
```tsx
<img src={`${import.meta.env.BASE_URL}design/dm-mark.svg`} alt="" />
```
Verify local nonempty assets and `npm run build -- --base=/dungeon-master/`.
