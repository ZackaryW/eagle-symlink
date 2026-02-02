# Active Context: Eagle Symlink Plugin

## Current Focus
Phase 5 (Validate) - Implementation complete, tested in Eagle

## Recent Changes (2026-02-02)

### Library Change Handling (Fixed)
- **Issue**: `eagle-cooltils` `onLibraryChange` provided undefined event data
- **Solution**: Use Eagle's native `eagle.onLibraryChanged(callback)` API
- **Library info**: Use `eagle.library.info()` async method for reliable data
- Config now properly reloads when switching libraries

### Background Service
- Plugin runs as **both window AND background service**
- Both point to same `dist/index.html` (no separate entry needed)
- Background auto-starts with Eagle, runs sync on interval when active

### Active Toggle
- `active: boolean` in config (default: `false`)
- Header toggle: "Active" / "Inactive" with visual indicator
- Auto-sync only runs when `active: true`
- Manual sync still works when inactive (for testing)
- **Important**: Auto-sync on load also checks `active` flag

### Reset Configuration
- "Danger Zone" in Advanced Settings
- Reset button clears all settings + sync index
- Confirmation dialog before reset
- Does NOT delete synced files in target directory

## Clarified Requirements

### Sync Modes
| Mode | Description |
|------|-------------|
| **Entry Dir** | Symlink entire `.info` directory (preserves metadata access) |
| **Entry File** | Symlink just the file, add `(ID)` suffix on collision |
| **Copy** | Actually copy file to target (no symlinks needed) |

### Edge Case Handling
| Case | Behavior |
|------|----------|
| Missing files | Skip silently |
| Name collision | Add `(8-char ID)` suffix |
| Target dir missing | Auto-create, abort if error |
| Symlink permission error | Abort, show Eagle dialog |

### Configuration
- Active toggle: Enable/disable auto-sync
- Sync interval: Configurable in Advanced Settings (default 3 min)
- Dir link type: Junction (no admin) or Directory symlink (needs Developer Mode)
- Platform: Windows only

## Key Decisions

### 1. Library Change Detection
- **Use**: Eagle's native `eagle.onLibraryChanged(callback)`
- **NOT**: eagle-cooltils `onLibraryChange` (event data unreliable)
- **Library name**: Use `eagle.library.info()` (async, reliable)

### 2. Background Service Architecture
- **Manifest**: Both `main` and `background` point to same `dist/index.html`
- **Rationale**: Same React app runs in both contexts; useSync hook handles everything
- **Benefit**: Single codebase, no code splitting issues

### 3. Config Strategy: Library UUID
- Using `createLibraryUuidPluginConfig()` - persists via `cooler-uuid.json`
- Config survives library move/rename
- Each library has independent configuration

### 4. Index-Based Cleanup
- Maintain `syncIndex: { [itemId]: targetPath }` in config
- Compare filtered items vs index to find items to add/remove
- Enables cleanup of dangling items without filesystem scan

### 5. Active Toggle Default
- Default `active: false` - user must explicitly enable
- Prevents unexpected sync on first install
- Auto-sync on load respects active flag

## Implementation Status ✅

### Core Files
- `src/lib/types.ts` - Type definitions (incl. `active` flag)
- `src/lib/core.ts` - Pure sync functions (28 tests)
- `src/lib/executors.ts` - Filesystem operations
- `src/hooks/useConfig.tsx` - Config + library change handling
- `src/hooks/useSync.tsx` - Sync orchestration + interval
- `src/components/FilterBuilder.tsx` - Filter condition UI
- `src/components/SyncSettings.tsx` - Mode + target path
- `src/components/SyncStatus.tsx` - Status bar + stats
- `src/components/ConfigModal.tsx` - Advanced settings + reset
- `src/App.tsx` - Main layout with active toggle

### Build Output
- Package: `eagle-symlink-v0.1.0.eagleplugin`
- Single entry: `dist/index.html` (~179KB JS)
- Tests: 28 passing, TypeScript: No errors

## Validation Checklist
- [x] Library change detection works
- [x] Config loads per-library
- [x] Active toggle prevents unwanted sync
- [ ] Test all 3 sync modes in Eagle
- [ ] Test background auto-sync
- [ ] Test reset configuration
