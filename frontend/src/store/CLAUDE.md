# Low-frequency backend state

Scope: `frontend/src/store/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own the Sprint 3 singleton backend bootstrap, profile/plan/progress snapshots and bounded aggregate sync queue; preserve the app reducer and gesture feature store.

## Code rules

- Use the existing external-store subscription and single-flight bootstrap/sync; do not add a state library.
- Keep profile, selected plan and compact session summaries here when authorized; never store frames, per-frame landmarks or continuous cursor positions.
- Keep feature-local state local and preserve guest operation when optional persistence fails.
- Do not add a state library merely to fill this directory.

## Dependencies

Store code may use contract types and storage helpers; no imports from pages or app runtime.

## Verification

Commands run from `frontend/` unless specified otherwise.
Test guest recovery/ownership, serialization, 20-entry capacity, bounded retry, storage failure and preservation of completed local results.

## Code example — storage failure with a memory fallback

Keep aggregate data available when browser storage throws, and expose persistent=false so the UI can report the limitation. Parse reads as unknown before validating a domain contract.

From [persistence.ts](persistence.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export class SafeStorage {
    private memory = new Map<string, string>();
    persistent = true;
    private storage: StorageLike | undefined;
    constructor(storage?: StorageLike) { this.storage = storage; if (!storage)
        this.persistent = false; }
    read(key: string): unknown {
        try {
            const text = this.storage?.getItem(key) ?? this.memory.get(key);
            return text ? JSON.parse(text) : null;
        }
        catch {
            return null;
        }
    }
    write(key: string, value: unknown) {
        const text = JSON.stringify(value);
        this.memory.set(key, text);
        try {
            this.storage?.setItem(key, text);
        }
        catch {
            this.persistent = false;
            this.storage = undefined;
        }
    }
    remove(key: string) { this.memory.delete(key); try {
        this.storage?.removeItem(key);
    }
    catch {
        this.persistent = false;
        this.storage = undefined;
    } }
}
```
