# Eagle Symlink Plugin

Automatically sync Eagle library items to a target directory using symlinks or file copies, with smart filtering.

![](./preview.png)

## Features

- **3 Sync Modes**:
  - **Entry Directory** - Symlink entire `.info` folders (preserves metadata)
  - **Entry File** - Symlink just the files (with collision handling)
  - **Copy** - Copy files to target (no symlinks needed)

- **Smart Filtering** - Filter items by tags, folders, rating, extension, date, etc.
- **Background Sync** - Auto-syncs on configurable interval (default: 3 min)
- **Per-Library Config** - Each Eagle library has independent settings
- **Active Toggle** - Enable/disable sync without losing configuration

## Installation

1. Download `eagle-symlink-v0.1.0.eagleplugin`
2. Double-click to install in Eagle
3. Or drag into Eagle window

## Usage

1. Open plugin from Eagle's plugin menu
2. Select **Sync Mode** (Entry Dir / Entry File / Copy)
3. Set **Target Directory** (default: `~/.eaglecooler/symlink`)
4. Configure **Filter** conditions (optional)
5. Toggle **Active** to enable auto-sync

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Mode | Symlink type or copy | Entry File |
| Target Path | Where to sync files | `~/.eaglecooler/symlink` |
| Sync Interval | Auto-sync frequency | 3 minutes |
| Dir Link Type | Junction or Directory symlink | Junction |

## Requirements

- **Windows only** (symlinks require Windows APIs)
- **Developer Mode** required for directory symlinks (not junctions)

## Tech Stack

- React 18 + TypeScript
- Vite (build)
- TailwindCSS + DaisyUI
- [eagle-cooltils](https://github.com/eagle-cooler/eagle-cooltils)

## Development

```sh
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Package plugin
pnpm build && Compress-Archive -Path "manifest.json", "dist" -DestinationPath "eagle-symlink-v0.1.0.eagleplugin" -Force
```

## License

MIT
