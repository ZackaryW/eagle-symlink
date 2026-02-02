import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  sanitizeFilename,
  generateTargetPath,
  computeSyncPlan,
  buildNewIndex,
} from './core';
import type { SyncItem, SyncIndex } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

/** Helper to create platform-agnostic paths */
const p = (...segments: string[]) => path.join(...segments);

function createItem(overrides: Partial<SyncItem> = {}): SyncItem {
  return {
    id: 'ABC123DEF456',
    name: 'test-image',
    ext: 'png',
    filePath: p('C:', 'Library', 'images', 'ABC123DEF456.info', 'test-image.png'),
    ...overrides,
  };
}

// ============================================================================
// sanitizeFilename
// ============================================================================

describe('sanitizeFilename', () => {
  it('should return unchanged name when no invalid chars', () => {
    expect(sanitizeFilename('my-image')).toBe('my-image');
    expect(sanitizeFilename('photo_2024')).toBe('photo_2024');
  });

  it('should replace < and > with underscore', () => {
    expect(sanitizeFilename('file<name>')).toBe('file_name_');
  });

  it('should replace colon with underscore', () => {
    expect(sanitizeFilename('file:name')).toBe('file_name');
  });

  it('should replace quotes with underscore', () => {
    expect(sanitizeFilename('file"name')).toBe('file_name');
  });

  it('should replace slashes with underscore', () => {
    expect(sanitizeFilename('file/name\\path')).toBe('file_name_path');
  });

  it('should replace pipe with underscore', () => {
    expect(sanitizeFilename('file|name')).toBe('file_name');
  });

  it('should replace question mark with underscore', () => {
    expect(sanitizeFilename('file?name')).toBe('file_name');
  });

  it('should replace asterisk with underscore', () => {
    expect(sanitizeFilename('file*name')).toBe('file_name');
  });

  it('should handle multiple invalid chars', () => {
    expect(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });
});

// ============================================================================
// generateTargetPath - Entry Dir Mode
// ============================================================================

describe('generateTargetPath - entry-dir mode', () => {
  const targetDir = p('C:', 'Links');

  it('should use item ID as folder name with .info suffix', () => {
    const item = createItem({ id: 'ITEM123456' });
    const result = generateTargetPath(item, targetDir, 'entry-dir');
    expect(result).toBe(p('C:', 'Links', 'ITEM123456.info'));
  });

  it('should ignore existing names (no collision handling for entry-dir)', () => {
    const item = createItem({ id: 'ITEM123456' });
    const existingNames = new Set(['item123456.info']);
    const result = generateTargetPath(item, targetDir, 'entry-dir', existingNames);
    // Entry-dir uses item ID, so it's always unique
    expect(result).toBe(p('C:', 'Links', 'ITEM123456.info'));
  });
});

// ============================================================================
// generateTargetPath - Entry File Mode
// ============================================================================

describe('generateTargetPath - entry-file mode', () => {
  const targetDir = p('C:', 'Links');

  it('should use sanitized name with extension when no collision', () => {
    const item = createItem({ name: 'my-photo', ext: 'jpg' });
    const result = generateTargetPath(item, targetDir, 'entry-file');
    expect(result).toBe(p('C:', 'Links', 'my-photo.jpg'));
  });

  it('should sanitize invalid characters in name', () => {
    const item = createItem({ name: 'photo<2024>', ext: 'png' });
    const result = generateTargetPath(item, targetDir, 'entry-file');
    expect(result).toBe(p('C:', 'Links', 'photo_2024_.png'));
  });

  it('should add ID suffix on collision', () => {
    const item = createItem({ id: 'ABC123DEF456', name: 'photo', ext: 'png' });
    const existingNames = new Set(['photo.png']);
    const result = generateTargetPath(item, targetDir, 'entry-file', existingNames);
    expect(result).toBe(p('C:', 'Links', 'photo (ABC123DE).png'));
  });

  it('should be case-insensitive for collision detection', () => {
    const item = createItem({ id: 'ABC123DEF456', name: 'Photo', ext: 'PNG' });
    const existingNames = new Set(['photo.png']); // lowercase
    const result = generateTargetPath(item, targetDir, 'entry-file', existingNames);
    expect(result).toBe(p('C:', 'Links', 'Photo (ABC123DE).PNG'));
  });
});

// ============================================================================
// generateTargetPath - Copy Mode
// ============================================================================

describe('generateTargetPath - copy mode', () => {
  const targetDir = p('C:', 'Links');

  it('should behave same as entry-file mode', () => {
    const item = createItem({ name: 'my-photo', ext: 'jpg' });
    const result = generateTargetPath(item, targetDir, 'copy');
    expect(result).toBe(p('C:', 'Links', 'my-photo.jpg'));
  });

  it('should add ID suffix on collision', () => {
    const item = createItem({ id: 'XYZ789ABC123', name: 'document', ext: 'pdf' });
    const existingNames = new Set(['document.pdf']);
    const result = generateTargetPath(item, targetDir, 'copy', existingNames);
    expect(result).toBe(p('C:', 'Links', 'document (XYZ789AB).pdf'));
  });
});

// ============================================================================
// computeSyncPlan
// ============================================================================

describe('computeSyncPlan', () => {
  const targetDir = p('C:', 'Links');

  it('should create all items when index is empty', () => {
    const items = [
      createItem({ id: 'ITEM1', name: 'photo1', ext: 'jpg' }),
      createItem({ id: 'ITEM2', name: 'photo2', ext: 'png' }),
    ];
    const currentIndex: SyncIndex = {};

    const plan = computeSyncPlan(items, currentIndex, 'entry-file', targetDir);

    expect(plan.toCreate).toHaveLength(2);
    expect(plan.toRemove).toHaveLength(0);
    expect(plan.toCreate[0].item.id).toBe('ITEM1');
    expect(plan.toCreate[0].targetPath).toBe(p('C:', 'Links', 'photo1.jpg'));
    expect(plan.toCreate[1].item.id).toBe('ITEM2');
    expect(plan.toCreate[1].targetPath).toBe(p('C:', 'Links', 'photo2.png'));
  });

  it('should remove items no longer in filtered set', () => {
    const items: SyncItem[] = []; // Empty filtered set
    const currentIndex: SyncIndex = {
      'ITEM1': p('C:', 'Links', 'photo1.jpg'),
      'ITEM2': p('C:', 'Links', 'photo2.png'),
    };

    const plan = computeSyncPlan(items, currentIndex, 'entry-file', targetDir);

    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toRemove).toHaveLength(2);
    expect(plan.toRemove).toContain(p('C:', 'Links', 'photo1.jpg'));
    expect(plan.toRemove).toContain(p('C:', 'Links', 'photo2.png'));
  });

  it('should skip items already in index', () => {
    const items = [
      createItem({ id: 'ITEM1', name: 'photo1', ext: 'jpg' }),
      createItem({ id: 'ITEM2', name: 'photo2', ext: 'png' }),
    ];
    const currentIndex: SyncIndex = {
      'ITEM1': p('C:', 'Links', 'photo1.jpg'), // Already synced
    };

    const plan = computeSyncPlan(items, currentIndex, 'entry-file', targetDir);

    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].item.id).toBe('ITEM2');
    expect(plan.toRemove).toHaveLength(0);
  });

  it('should handle mixed add/remove scenario', () => {
    const items = [
      createItem({ id: 'ITEM1', name: 'photo1', ext: 'jpg' }), // Keep
      createItem({ id: 'ITEM3', name: 'photo3', ext: 'gif' }), // Add
    ];
    const currentIndex: SyncIndex = {
      'ITEM1': p('C:', 'Links', 'photo1.jpg'), // Keep
      'ITEM2': p('C:', 'Links', 'photo2.png'), // Remove
    };

    const plan = computeSyncPlan(items, currentIndex, 'entry-file', targetDir);

    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].item.id).toBe('ITEM3');
    expect(plan.toRemove).toHaveLength(1);
    expect(plan.toRemove[0]).toBe(p('C:', 'Links', 'photo2.png'));
  });

  it('should handle collision with existing synced item', () => {
    const items = [
      createItem({ id: 'ITEM1', name: 'photo', ext: 'jpg' }), // Already synced
      createItem({ id: 'ITEM2', name: 'photo', ext: 'jpg' }), // New, same name
    ];
    const currentIndex: SyncIndex = {
      'ITEM1': p('C:', 'Links', 'photo.jpg'),
    };

    const plan = computeSyncPlan(items, currentIndex, 'entry-file', targetDir);

    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].item.id).toBe('ITEM2');
    // Should have ID suffix due to collision
    expect(plan.toCreate[0].targetPath).toBe(p('C:', 'Links', 'photo (ITEM2).jpg'));
  });

  it('should handle collision between new items', () => {
    const items = [
      createItem({ id: 'ITEM1', name: 'photo', ext: 'jpg' }),
      createItem({ id: 'ITEM2', name: 'photo', ext: 'jpg' }), // Same name
    ];
    const currentIndex: SyncIndex = {};

    const plan = computeSyncPlan(items, currentIndex, 'entry-file', targetDir);

    expect(plan.toCreate).toHaveLength(2);
    // First gets simple name
    expect(plan.toCreate[0].targetPath).toBe(p('C:', 'Links', 'photo.jpg'));
    // Second gets ID suffix
    expect(plan.toCreate[1].targetPath).toBe(p('C:', 'Links', 'photo (ITEM2).jpg'));
  });

  it('should work with entry-dir mode', () => {
    const items = [
      createItem({ id: 'ITEM1' }),
      createItem({ id: 'ITEM2' }),
    ];
    const currentIndex: SyncIndex = {};

    const plan = computeSyncPlan(items, currentIndex, 'entry-dir', targetDir);

    expect(plan.toCreate).toHaveLength(2);
    expect(plan.toCreate[0].targetPath).toBe(p('C:', 'Links', 'ITEM1.info'));
    expect(plan.toCreate[1].targetPath).toBe(p('C:', 'Links', 'ITEM2.info'));
  });
});

// ============================================================================
// buildNewIndex
// ============================================================================

describe('buildNewIndex', () => {
  it('should add created items to index', () => {
    const currentIndex: SyncIndex = {};
    const plan = {
      toCreate: [
        { item: createItem({ id: 'ITEM1' }), targetPath: p('C:', 'Links', 'photo1.jpg') },
        { item: createItem({ id: 'ITEM2' }), targetPath: p('C:', 'Links', 'photo2.png') },
      ],
      toRemove: [],
      skipped: [],
    };

    const newIndex = buildNewIndex(currentIndex, plan);

    expect(newIndex).toEqual({
      'ITEM1': p('C:', 'Links', 'photo1.jpg'),
      'ITEM2': p('C:', 'Links', 'photo2.png'),
    });
  });

  it('should remove items from index', () => {
    const currentIndex: SyncIndex = {
      'ITEM1': p('C:', 'Links', 'photo1.jpg'),
      'ITEM2': p('C:', 'Links', 'photo2.png'),
    };
    const plan = {
      toCreate: [],
      toRemove: [p('C:', 'Links', 'photo1.jpg')],
      skipped: [],
    };

    const newIndex = buildNewIndex(currentIndex, plan);

    expect(newIndex).toEqual({
      'ITEM2': p('C:', 'Links', 'photo2.png'),
    });
  });

  it('should handle mixed add/remove', () => {
    const currentIndex: SyncIndex = {
      'ITEM1': p('C:', 'Links', 'photo1.jpg'),
      'ITEM2': p('C:', 'Links', 'photo2.png'),
    };
    const plan = {
      toCreate: [
        { item: createItem({ id: 'ITEM3' }), targetPath: p('C:', 'Links', 'photo3.gif') },
      ],
      toRemove: [p('C:', 'Links', 'photo2.png')],
      skipped: [],
    };

    const newIndex = buildNewIndex(currentIndex, plan);

    expect(newIndex).toEqual({
      'ITEM1': p('C:', 'Links', 'photo1.jpg'),
      'ITEM3': p('C:', 'Links', 'photo3.gif'),
    });
  });

  it('should preserve existing index when no changes', () => {
    const currentIndex: SyncIndex = {
      'ITEM1': p('C:', 'Links', 'photo1.jpg'),
    };
    const plan = {
      toCreate: [],
      toRemove: [],
      skipped: [],
    };

    const newIndex = buildNewIndex(currentIndex, plan);

    expect(newIndex).toEqual(currentIndex);
    // Should be a new object, not the same reference
    expect(newIndex).not.toBe(currentIndex);
  });
});
