# Product Context: Eagle Symlink Plugin

## Problem Statement
Eagle stores files in a proprietary library structure that isn't directly accessible to other applications. Users need a way to:
1. Make filtered subsets of their Eagle library available via standard filesystem
2. Keep the exposed files in sync with Eagle library changes
3. Persist configuration even when moving/renaming libraries

## Solution
A sync plugin that:
- Creates Windows symlinks or file copies pointing to Eagle items
- Maintains synchronization automatically on a configurable schedule
- Filters items based on smart filter conditions
- Stores config using library UUID (portable across moves)
- Maintains an index for cleanup of dangling items

## User Experience Goals

### Configuration Flow
1. User opens plugin → sees current sync status
2. Selects sync mode (Entry Dir / Entry File / Copy)
3. Sets target directory (folder picker via Eagle dialog)
4. Builds filter conditions (same UI as example FilterBuilder)
5. Clicks "Save & Sync" to start

### Ongoing Usage
- Plugin auto-syncs on configurable interval (default 3 min)
- Separate config window for advanced settings (interval, etc.)
- Status bar shows: last sync time, item count, errors
- Manual "Sync Now" button available

### Visual Layout
```
┌─────────────────────────────────────────────────────┐
│ Eagle Symlink                      [⚙️] [🌙] [Sync] │
├─────────────────────────────────────────────────────┤
│ ┌─ Settings ──────────────────────────────────────┐ │
│ │ Mode: (●) Entry Dir  ( ) Entry File  ( ) Copy  │ │
│ │ Target: [C:\Links\Eagle] [Browse...]           │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ┌─ Filter Builder ────────────────────────────────┐ │
│ │ (Same as example - conditions/rules UI)        │ │
│ │ [+ Add Condition]                              │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Status: ✓ 150 items synced (3 added, 2 removed)    │
│ Last sync: 2 minutes ago | Next: 1 minute          │
└─────────────────────────────────────────────────────┘
```

## Key Behaviors

### Sync Mode Details
| Mode | Output | Naming | Use Case |
|------|--------|--------|----------|
| Entry Dir | Symlink to `.info` folder | `{id}.info` | Full metadata access |
| Entry File | Symlink to file | `{name} ({id}).{ext}` on collision | Clean file access |
| Copy | Actual file copy | `{name} ({id}).{ext}` on collision | Portable, no symlinks |

### Directory Link Type (Entry Dir mode)
| Type | Admin/Dev Mode | Notes |
|------|----------------|-------|
| Junction (default) | ❌ Not required | Works everywhere, absolute paths |
| Dir (symlink) | ✅ Required | More flexible, some apps prefer it |

Configurable in advanced settings (ConfigModal).

### Index-Based Cleanup
- Maintain `syncIndex: { [itemId]: targetPath }` in config
- On each sync: compare current filtered items vs index
- Remove targets for items no longer in filtered set
- Update index with new synced items

### Collision Handling (Mode B & C)
- First file: `somefile.png`
- Collision: `somefile (ABC123).png` (8-char ID suffix)

### Error Handling
- Missing files: Skip silently
- Target dir missing: Auto-create, abort if creation fails
- Symlink permission error: Abort sync, show Eagle dialog with Developer Mode instructions
- Other errors: Abort sync, show error details
