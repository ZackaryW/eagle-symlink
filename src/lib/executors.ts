/**
 * Sync plan executors - filesystem operations
 * @module lib/executors
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SyncMode, SyncPlan, SyncResult, SyncIndex, DirLinkType } from './types';

// Import eagle-cooltils symlink functions
import { createEntrySymlink, createItemFileSymlink } from 'eagle-cooltils/win';

/**
 * Options for executing a sync plan
 */
export interface ExecuteOptions {
  /** Library path for entry-dir mode */
  libraryPath: string;
  /** Directory link type for entry-dir mode */
  dirLinkType?: DirLinkType;
}

/**
 * Ensure the target directory exists, creating it if necessary
 * 
 * @param targetDir - Directory path to ensure exists
 * @throws Error if directory cannot be created
 */
export async function ensureTargetDir(targetDir: string): Promise<void> {
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (error) {
    const err = new Error(`Failed to create target directory: ${targetDir}`);
    (err as Error & { cause: unknown }).cause = error;
    throw err;
  }
}

/**
 * Execute removals from the sync plan
 * 
 * @param toRemove - Paths to remove
 * @returns Results of removal operations
 */
async function executeRemovals(toRemove: string[]): Promise<{
  removed: number;
  errors: Array<{ path: string; error: Error }>;
}> {
  const result = {
    removed: 0,
    errors: [] as Array<{ path: string; error: Error }>,
  };

  for (const targetPath of toRemove) {
    try {
      // Use lstat to check if it exists (works for symlinks)
      const stat = await fs.lstat(targetPath).catch(() => null);
      if (stat) {
        // Remove symlink/junction or file/directory
        await fs.rm(targetPath, { recursive: true, force: true });
        result.removed++;
      }
    } catch (error) {
      result.errors.push({ path: targetPath, error: error as Error });
    }
  }

  return result;
}

/**
 * Execute the sync plan for entry-dir mode
 * Creates symlinks/junctions to .info directories
 */
async function executeEntryDir(
  plan: SyncPlan,
  currentIndex: SyncIndex,
  options: ExecuteOptions
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    removed: 0,
    skipped: plan.skipped.length,
    newIndex: { ...currentIndex },
    errors: [],
  };

  // Execute removals first
  const removalResult = await executeRemovals(plan.toRemove);
  result.removed = removalResult.removed;
  result.errors.push(...removalResult.errors.map(e => ({ path: e.path, error: e.error })));

  // Execute creations
  for (const { item, targetPath } of plan.toCreate) {
    try {
      await createEntrySymlink(
        options.libraryPath,
        item.id,
        targetPath,
        { type: options.dirLinkType ?? 'junction', overwrite: true }
      );
      result.created++;
      result.newIndex[item.id] = targetPath;
    } catch (error) {
      result.errors.push({ item, error: error as Error });
    }
  }

  // Remove entries for removed items
  for (const removedPath of plan.toRemove) {
    for (const [itemId, indexPath] of Object.entries(result.newIndex)) {
      if (indexPath === removedPath) {
        delete result.newIndex[itemId];
        break;
      }
    }
  }

  return result;
}

/**
 * Execute the sync plan for entry-file mode
 * Creates symlinks to item files
 */
async function executeEntryFile(
  plan: SyncPlan,
  currentIndex: SyncIndex,
  _options: ExecuteOptions
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    removed: 0,
    skipped: plan.skipped.length,
    newIndex: { ...currentIndex },
    errors: [],
  };

  // Execute removals first
  const removalResult = await executeRemovals(plan.toRemove);
  result.removed = removalResult.removed;
  result.errors.push(...removalResult.errors.map(e => ({ path: e.path, error: e.error })));

  // Execute creations
  for (const { item, targetPath } of plan.toCreate) {
    try {
      // Check if source file exists
      const exists = await fs.stat(item.filePath).catch(() => null);
      if (!exists) {
        result.skipped++;
        continue;
      }

      await createItemFileSymlink(item.filePath, targetPath, { overwrite: true });
      result.created++;
      result.newIndex[item.id] = targetPath;
    } catch (error) {
      result.errors.push({ item, error: error as Error });
    }
  }

  // Remove entries for removed items
  for (const removedPath of plan.toRemove) {
    for (const [itemId, indexPath] of Object.entries(result.newIndex)) {
      if (indexPath === removedPath) {
        delete result.newIndex[itemId];
        break;
      }
    }
  }

  return result;
}

/**
 * Execute the sync plan for copy mode
 * Copies files to target directory
 */
async function executeCopy(
  plan: SyncPlan,
  currentIndex: SyncIndex,
  _options: ExecuteOptions
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    removed: 0,
    skipped: plan.skipped.length,
    newIndex: { ...currentIndex },
    errors: [],
  };

  // Execute removals first
  const removalResult = await executeRemovals(plan.toRemove);
  result.removed = removalResult.removed;
  result.errors.push(...removalResult.errors.map(e => ({ path: e.path, error: e.error })));

  // Execute creations (copies)
  for (const { item, targetPath } of plan.toCreate) {
    try {
      // Check if source file exists
      const exists = await fs.stat(item.filePath).catch(() => null);
      if (!exists) {
        result.skipped++;
        continue;
      }

      // Ensure parent directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      
      // Copy the file
      await fs.copyFile(item.filePath, targetPath);
      result.created++;
      result.newIndex[item.id] = targetPath;
    } catch (error) {
      result.errors.push({ item, error: error as Error });
    }
  }

  // Remove entries for removed items
  for (const removedPath of plan.toRemove) {
    for (const [itemId, indexPath] of Object.entries(result.newIndex)) {
      if (indexPath === removedPath) {
        delete result.newIndex[itemId];
        break;
      }
    }
  }

  return result;
}

/**
 * Execute a sync plan
 * 
 * @param plan - The sync plan to execute
 * @param mode - The sync mode
 * @param currentIndex - Current sync index
 * @param options - Execution options
 * @returns Sync result with stats and updated index
 */
export async function executePlan(
  plan: SyncPlan,
  mode: SyncMode,
  currentIndex: SyncIndex,
  options: ExecuteOptions
): Promise<SyncResult> {
  switch (mode) {
    case 'entry-dir':
      return executeEntryDir(plan, currentIndex, options);
    case 'entry-file':
      return executeEntryFile(plan, currentIndex, options);
    case 'copy':
      return executeCopy(plan, currentIndex, options);
    default:
      throw new Error(`Unknown sync mode: ${mode}`);
  }
}

/**
 * Check if an error is a permission error (Developer Mode not enabled)
 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof Error) {
    // Windows EPERM or EACCES errors
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'EPERM' || code === 'EACCES';
  }
  return false;
}
