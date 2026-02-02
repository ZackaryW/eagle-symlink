/**
 * Core sync logic - pure functions, fully testable
 * @module lib/core
 */

import path from 'node:path';
import type { SyncMode, SyncItem, SyncIndex, SyncPlan } from './types';

/**
 * Characters not allowed in Windows filenames
 */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

/**
 * Sanitize a filename for Windows filesystem
 */
export function sanitizeFilename(name: string): string {
  return name.replace(INVALID_FILENAME_CHARS, '_');
}

/**
 * Generate the target path for an item based on sync mode
 * 
 * @param item - The item to generate path for
 * @param targetDir - The target directory
 * @param mode - The sync mode
 * @param existingNames - Set of existing filenames (lowercase) for collision detection
 * @returns The full target path
 */
export function generateTargetPath(
  item: Pick<SyncItem, 'id' | 'name' | 'ext'>,
  targetDir: string,
  mode: SyncMode,
  existingNames: Set<string> = new Set()
): string {
  // Entry Dir mode: use item ID as folder name
  if (mode === 'entry-dir') {
    return path.join(targetDir, `${item.id}.info`);
  }

  // Entry File and Copy modes: use item name with collision handling
  const safeName = sanitizeFilename(item.name);
  const baseName = `${safeName}.${item.ext}`;
  const baseNameLower = baseName.toLowerCase();

  // No collision: use simple name
  if (!existingNames.has(baseNameLower)) {
    return path.join(targetDir, baseName);
  }

  // Collision: add ID suffix
  const idPart = item.id.slice(0, 8).toUpperCase();
  const collisionName = `${safeName} (${idPart}).${item.ext}`;
  return path.join(targetDir, collisionName);
}

/**
 * Compute the sync plan by comparing filtered items against current index
 * 
 * @param items - Filtered items to sync
 * @param currentIndex - Current sync index
 * @param mode - Sync mode
 * @param targetDir - Target directory
 * @returns Sync plan with items to create/remove
 */
export function computeSyncPlan(
  items: SyncItem[],
  currentIndex: SyncIndex,
  mode: SyncMode,
  targetDir: string
): SyncPlan {
  const plan: SyncPlan = {
    toCreate: [],
    toRemove: [],
    skipped: [],
  };

  // Get current item IDs from index
  const indexedIds = new Set(Object.keys(currentIndex));
  
  // Get filtered item IDs
  const filteredIds = new Set(items.map(item => item.id));

  // Build set of existing names for collision detection
  // Include names from items that will remain (in both filtered and index)
  const existingNames = new Set<string>();
  
  // First pass: collect names of items that are already synced and staying
  for (const item of items) {
    if (indexedIds.has(item.id)) {
      const existingPath = currentIndex[item.id];
      const existingName = path.basename(existingPath).toLowerCase();
      existingNames.add(existingName);
    }
  }

  // Items to create: in filtered but not in index
  for (const item of items) {
    if (!indexedIds.has(item.id)) {
      const targetPath = generateTargetPath(item, targetDir, mode, existingNames);
      plan.toCreate.push({ item, targetPath });
      // Add to existing names to prevent collisions with subsequent items
      existingNames.add(path.basename(targetPath).toLowerCase());
    }
  }

  // Items to remove: in index but not in filtered
  for (const [itemId, targetPath] of Object.entries(currentIndex)) {
    if (!filteredIds.has(itemId)) {
      plan.toRemove.push(targetPath);
    }
  }

  return plan;
}

/**
 * Build the new sync index after plan execution
 * 
 * @param currentIndex - Current sync index
 * @param plan - The sync plan that was executed
 * @returns Updated sync index
 */
export function buildNewIndex(
  currentIndex: SyncIndex,
  plan: SyncPlan
): SyncIndex {
  const newIndex: SyncIndex = { ...currentIndex };

  // Remove entries for removed items
  for (const removedPath of plan.toRemove) {
    // Find the item ID for this path
    for (const [itemId, path] of Object.entries(newIndex)) {
      if (path === removedPath) {
        delete newIndex[itemId];
        break;
      }
    }
  }

  // Add entries for created items
  for (const { item, targetPath } of plan.toCreate) {
    newIndex[item.id] = targetPath;
  }

  return newIndex;
}
