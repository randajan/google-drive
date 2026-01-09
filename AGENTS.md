# AGENTS

## Project Overview
- Name:
- Purpose:
- Main entrypoints:

## Key Modules
- `src/sync/static.js` - decision tree for sync actions
- `src/sync/Sync.js` - public API
- `src/sync/db.js` - state persistence
- `src/sync/tools.js` - IO helpers

## Sync Logic (Priority)
1. `rec.state` (only if `isRecFresh`)
2. `mode` (`PULL`/`PUSH`)
3. auto (timestamps)

## Actions (8)
- Pull remove
- Push remove
- Pull overwrite
- Push overwrite
- Pull update
- Push update
- Pull new
- Push new

## Debug Labels
- Sweep = no local and no remote
- Ok = timestamps match
- Action labels = one of 8 actions

## Best Practices
- Keep sync decisions in one place (`_sync2`) to avoid divergent behavior.
- Do not add new side effects in `syncFiles`; it should only iterate and delegate.
- Always log exactly one action per file to keep debugging deterministic.
- Avoid mixing `rec.state` with `mode` semantics; `rec.state` is per-file intent.
- If you extend actions, update both debug labels and decision tree together.
- Prefer small helper vars (`hasLocal`, `hasRemote`, `desired`, `autoDesired`) over nested conditions.

## Expected Behaviors
- `PULL` removes local if remote missing.
- `PUSH` removes remote if local missing.
- `overwrite` only when desired conflicts with auto.

## Notes / Gotchas
- `rec.ts` is set on every DB write.
- `isRecFresh` compares `rec.ts` vs local/remote timestamps.

## TODO / Open Questions
- ...
