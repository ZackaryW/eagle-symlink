# Project Brief: Eagle Symlink Plugin

## Overview
A React-based Eagle plugin that syncs Eagle library items to a target directory using symlinks or file copies, filtered by configurable smart filter conditions. Uses `eagle-cooltils` for filtering, config, and Windows symlink utilities.

## Core Requirements

1. **Sync Modes** - Three operational modes:
   - **Mode A: Entry Directory** - Symlink entire `.info` directories to target
     ```
     target/
     ├── xxx.info → (symlink to library/images/xxx.info)
     └── yyy.info → (symlink to library/images/yyy.info)
     ```
   - **Mode B: Entry File** - Symlink just the item file, rename with ID on collision
     ```
     target/
     └── somefile (ABC123).png → (symlink to actual file)
     ```
   - **Mode C: Copy** - Copy the actual file to target directory

2. **Sync Index** - Maintain an index of synced items to:
   - Track what has been synced
   - Enable cleanup of dangling items (removed from filter/library)

3. **Target Path Configuration** - User-configurable destination directory

4. **Filter Conditions** - Smart filter builder (same as example) to define eligible items
   - Supports all filter properties: tags, folders, name, ext, star, etc.
   - Files only (ignores folder items)
   - Persists filter configuration per-library using UUID config

5. **Sync Triggers**:
   - On plugin start/enter
   - On configurable interval (default 3 minutes, adjustable in config window)
   - Manual sync button

6. **Per-Library Config** - Uses `createLibraryUuidPluginConfig()` for:
   - Sync mode selection (A/B/C)
   - Target path
   - Filter conditions
   - Sync interval setting
   - Sync index
   - Ensures config persists if library is moved/renamed

## Goals
- Provide a reliable way to expose Eagle library files via symlinks or copies
- Support complex filtering for targeted sync
- Maintain clean target directory via index-based cleanup
- Clean UI showing sync status and statistics

## Non-Goals
- macOS support (Windows-only for now)
- Two-way content sync (one-way: Eagle → target)
- Nested folder structure in target (flat directory)

## Tech Stack
- React 18 + TypeScript
- Vite (bundler, CJS output)
- TailwindCSS + DaisyUI
- eagle-cooltils (filter, config, win/symlink)

## Target Users
- Eagle users wanting to expose library files to external applications
- Users who need filtered subsets of their library accessible via filesystem
