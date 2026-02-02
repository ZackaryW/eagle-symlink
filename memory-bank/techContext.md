# Tech Context: Eagle Symlink Plugin

## Dependencies

### Runtime
- `eagle-cooltils` (0.0.3)
  - `/universal`: filterItems, config system, ItemFilter types
  - `/win`: createEntrySymlink, createItemFileSymlink

### Dev
- React 18, TypeScript
- Vite (build), TailwindCSS + DaisyUI (styling)
- Vitest (testing)

## Eagle Plugin Types

Eagle supports 4 plugin types via manifest.json:

| Type | Entry Key | Auto-start | Visible UI |
|------|-----------|------------|------------|
| **Window** | `main` | No | Yes |
| **Background** | `background` | Yes | No |
| **Format** | `preview` | No | Yes |
| **Inspector** | `inspector` | No | Yes |

### Background Service Configuration
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

**Key Pattern**: Both can point to the same HTML entry. The same React app runs in both contexts - Eagle handles visibility. No separate background script needed.

## Eagle Native APIs

### Library Change Detection
**IMPORTANT**: Use Eagle's native API, NOT eagle-cooltils for library changes.

```typescript
// Eagle's native API - provides libraryPath directly in callback
eagle.onLibraryChanged((libraryPath) => {
  console.log('Library changed to:', libraryPath);
  
  // Use eagle.library.info() for complete details
  const info = await eagle.library.info();
  console.log('Library name:', info.name);
});
```

**Why not eagle-cooltils `onLibraryChange`?**
- The event object can have undefined values during rapid library switches
- Eagle's native API provides the path directly in the callback
- `eagle.library.info()` is async and reliable for getting library details

### Library Info
```typescript
// Async method - reliable for getting library details after switch
const info = await eagle.library.info();
// Returns: { name: string, path: string, ... }

// Direct property access - may be undefined during library switch
eagle.library.name  // ⚠️ Can be undefined
eagle.library.path  // ⚠️ Can be undefined
```

## eagle-cooltils Usage

### Config (Per-Library UUID)
```typescript
import { initEagleConfig, createLibraryUuidPluginConfig } from 'eagle-cooltils/universal';

// Initialize in onPluginCreate
eagle.onPluginCreate((plugin) => {
  initEagleConfig(plugin);
});

// Create config instance (uses cooler-uuid.json in library)
const config = createLibraryUuidPluginConfig();

// On library change, recreate the instance
eagle.onLibraryChanged(async () => {
  configInstance = createLibraryUuidPluginConfig();
  await loadConfig();
});
```

### Config Schema
```typescript
interface PluginConfig {
  active: boolean;                    // Enable/disable auto-sync
  mode: 'entry-dir' | 'entry-file' | 'copy';
  targetPath: string;
  filter: ItemFilter;
  syncInterval: number;               // ms, default 180000 (3 min)
  syncIndex: { [itemId]: targetPath };
  lastSyncAt: number | null;
  dirLinkType: 'junction' | 'dir';    // For entry-dir mode
}
```

### Filtering
```typescript
import { filterItems, FilterableItem, ItemFilter } from 'eagle-cooltils/universal';

const eligibleItems = filterItems(items as FilterableItem[], filter as ItemFilter);
```

### Symlinks (Windows)
```typescript
import { createEntrySymlink, createItemFileSymlink } from 'eagle-cooltils/win';

// Entry directory symlink
await createEntrySymlink(libraryPath, itemId, targetPath, {
  type: 'junction',  // or 'dir' (needs Developer Mode)
  overwrite: true
});

// File symlink
await createItemFileSymlink(item.filePath, linkPath, { overwrite: true });
```

## Build Configuration

### Vite Config
```typescript
export default defineConfig({
  base: './',
  build: {
    outDir: './dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
      },
      external: [
        'node:fs', 'node:fs/promises', 'node:path', 'node:os',
        'node:child_process', 'node:crypto', 'node:stream',
        'fs', 'fs/promises', 'path', 'os', 'child_process', 'crypto',
      ],
      output: {
        format: 'cjs',  // Required for Eagle/Electron
        entryFileNames: 'assets/[name].js',
      },
    },
  },
  plugins: [react()],
});
```

**Important**: Use CJS format for Electron compatibility. Externalize Node.js built-ins.

## File Structure
```
eagle-symlink/
├── src/
│   ├── App.tsx              # Main app + active toggle
│   ├── main.tsx             # Entry point
│   ├── index.css            # Styles
│   ├── components/
│   │   ├── FilterBuilder.tsx
│   │   ├── SyncSettings.tsx
│   │   ├── SyncStatus.tsx
│   │   └── ConfigModal.tsx
│   ├── hooks/
│   │   ├── useConfig.tsx    # Config + library change handling
│   │   └── useSync.tsx
│   └── lib/
│       ├── types.ts
│       ├── core.ts
│       ├── core.test.ts
│       └── executors.ts
├── dist/                    # Build output
├── manifest.json
└── eagle-symlink-v0.1.0.eagleplugin
```

## Environment
- Eagle Plugin Runtime: Electron (Chromium 107, Node 18+)
- `eagle` global available
- Node.js APIs available (fs, path, crypto)
- Windows-only (symlinks require Windows)

## Packaging
```powershell
# Build
pnpm build

# Copy logo
cp src/assets/eagle.png dist/eagle.png

# Package
Compress-Archive -Path "manifest.json", "dist" -DestinationPath "eagle-symlink-v0.1.0.eagleplugin" -Force
```

Output: `eagle-symlink-v0.1.0.eagleplugin` (installable via Eagle)
