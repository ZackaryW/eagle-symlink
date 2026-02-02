# System Patterns: Eagle Symlink Plugin

## Architecture Overview

```
src/
├── App.tsx                 # Root component + layout + active toggle
├── main.tsx                # React entry, plugin init
├── components/
│   ├── FilterBuilder.tsx   # Filter condition UI (from example)
│   ├── SyncSettings.tsx    # Mode selector + target path
│   ├── SyncStatus.tsx      # Sync status + stats display
│   └── ConfigModal.tsx     # Advanced settings (interval, reset)
├── hooks/
│   ├── useConfig.tsx       # Config CRUD + persistence
│   └── useSync.tsx         # Sync orchestration + scheduling
└── lib/
    ├── types.ts            # Type definitions
    ├── core.ts             # Pure sync logic (testable)
    └── executors.ts        # Filesystem operations
```

## Background Service Pattern

### Manifest Configuration
```json
{
  "main": {
    "url": "dist/index.html",
    "width": 800,
    "height": 600
  },
  "background": {
    "url": "dist/index.html"
  }
}
```

**Key Insight**: Both `main` and `background` can point to the same entry HTML. Eagle loads the same React app in both contexts:
- **Main window**: Visible UI for user interaction
- **Background**: Invisible, runs sync logic via hooks

**Benefits**:
- Single codebase, no code splitting
- No separate background.ts needed
- useSync hook handles both contexts identically

### Active Toggle Pattern
```typescript
// In config
interface PluginConfig {
  active: boolean;  // Must be true for auto-sync
  // ...
}

// In useSync hook
useEffect(() => {
  // Only set up interval if active
  if (!config?.active || !config?.targetPath || !config?.syncInterval) {
    return;
  }
  
  intervalRef.current = setInterval(() => {
    sync();
  }, config.syncInterval);
  
  return () => clearInterval(intervalRef.current);
}, [config?.active, config?.syncInterval, config?.targetPath, sync]);
```

## Library Change Pattern

**CRITICAL**: Use Eagle's native API for library change detection.

```typescript
// In useConfig hook
useEffect(() => {
  // Use Eagle's native API - provides libraryPath in callback
  eagle.onLibraryChanged(async (libraryPath) => {
    console.log('[useConfig] Library changed to:', libraryPath);
    
    // Use eagle.library.info() for reliable library details
    const info = await eagle.library?.info();
    console.log('[useConfig] Library info:', info?.name);
    
    // Reinit config instance for new library
    reinitConfigInstance();
    await loadConfig();
  });
}, []);
```

**Why NOT eagle-cooltils `onLibraryChange`?**
- Event object can have undefined values during rapid switches
- Eagle's native API provides path directly in callback
- `eagle.library.info()` is async and reliable

**Key Methods**:
| Method | Type | Reliability |
|--------|------|-------------|
| `eagle.onLibraryChanged(cb)` | Native | ✅ Provides path in callback |
| `eagle.library.info()` | Async | ✅ Always returns valid data |
| `eagle.library.name` | Sync | ⚠️ Can be undefined during switch |
| `onLibraryChange` (cooltils) | Event | ⚠️ Event data can be undefined |

## Design Patterns

### 1. Separation of Concerns
- **lib/core.ts**: Pure functions, no React/Eagle dependencies, fully testable
- **lib/executors.ts**: Filesystem operations (symlink, copy, remove)
- **hooks/**: React integration, state management, side effects
- **components/**: UI rendering only

### 2. Config Schema
```typescript
interface PluginConfig {
  active: boolean;            // Enable/disable auto-sync
  mode: SyncMode;             // 'entry-dir' | 'entry-file' | 'copy'
  targetPath: string;         // Target directory path
  filter: ItemFilter;         // Smart filter conditions
  syncInterval: number;       // ms, default 180000 (3 min)
  syncIndex: SyncIndex;       // Tracks synced items { itemId: targetPath }
  lastSyncAt: number | null;  // Timestamp of last sync
  dirLinkType: DirLinkType;   // 'junction' (no admin) or 'dir' (Developer Mode)
}
```

### 3. Sync Plan Pattern
```typescript
interface SyncPlan {
  toCreate: Array<{ item: SyncItem; targetPath: string }>;
  toRemove: string[];         // Paths to remove (dangling)
  skipped: SkippedItem[];     // Items skipped (missing file, etc.)
}

// Pure function - easy to test
function computeSyncPlan(
  items: SyncItem[],
  currentIndex: SyncIndex,
  mode: SyncMode,
  targetDir: string
): SyncPlan;
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User toggles Active ON                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                     setActive(true) → persist config
                              ↓
              useSync detects config.active = true
                              ↓
                    Sets up interval timer
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ On interval tick (or manual sync)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         eagle.item.getAll() → filterItems() → computeSyncPlan()
                              ↓
                        executePlan()
                              ↓
              Mode A: createEntrySymlink()
              Mode B: createItemFileSymlink()
              Mode C: fs.copyFile()
                              ↓
                      updateSyncIndex()
```

## Sync Algorithm (Index-Based)

### For All Modes
1. Get all items, filter by conditions
2. Compare filtered item IDs vs current `syncIndex` keys
3. **toCreate**: Items in filtered but not in index
4. **toRemove**: Index entries not in filtered set
5. Execute plan, update index

### Mode A: Entry Directory
```typescript
const target = path.join(targetDir, `${item.id}.info`);
await createEntrySymlink(libraryPath, item.id, target, { 
  type: config.dirLinkType,  // 'junction' or 'dir'
  overwrite: true 
});
```

### Mode B: Entry File
```typescript
const target = generateTargetPath(item, targetDir, 'entry-file', existingNames);
await createItemFileSymlink(item.filePath, target, { overwrite: true });
```

### Mode C: Copy
```typescript
const target = generateTargetPath(item, targetDir, 'copy', existingNames);
await fs.copyFile(item.filePath, target);
```

## Naming Convention (Collision Handling)
```typescript
function generateTargetPath(item, targetDir, mode, existingNames) {
  if (mode === 'entry-dir') {
    return path.join(targetDir, `${item.id}.info`);
  }
  
  const safeName = item.name.replace(/[<>:"/\\|?*]/g, '_');
  const baseName = `${safeName}.${item.ext}`;
  
  if (!existingNames.has(baseName.toLowerCase())) {
    return path.join(targetDir, baseName);
  }
  
  // Collision: add ID suffix
  const idPart = item.id.slice(0, 8).toUpperCase();
  return path.join(targetDir, `${safeName} (${idPart}).${item.ext}`);
}
```

## Error Handling Strategy
| Scenario | Behavior |
|----------|----------|
| Missing file | Skip, don't add to index |
| Target dir creation fails | Abort, throw error |
| Symlink permission error | Abort, show Eagle dialog |
| Other errors | Abort sync, preserve existing index |

## Reset Configuration Pattern
```typescript
// In ConfigModal
const handleReset = () => {
  onResetConfig();  // Calls resetConfig from useConfig
  setShowResetConfirm(false);
  onClose();
};

// resetConfig clears to defaults
// Does NOT delete synced files in target directory
```
