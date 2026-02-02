/**
 * Sync mode types
 */
export type SyncMode = 'entry-dir' | 'entry-file' | 'copy';

/**
 * Directory link type for Entry Dir mode
 * - junction: Windows junction (no admin required)
 * - dir: Directory symlink (requires Developer Mode)
 */
export type DirLinkType = 'junction' | 'dir';

/**
 * Sync index: maps item ID to target path
 */
export interface SyncIndex {
  [itemId: string]: string;
}

/**
 * Minimal item info needed for sync operations
 */
export interface SyncItem {
  id: string;
  name: string;
  ext: string;
  filePath: string;
}

/**
 * Item that was skipped during sync
 */
export interface SkippedItem {
  item: SyncItem;
  reason: 'missing-file' | 'error';
  error?: Error;
}

/**
 * Sync plan computed from comparing filtered items vs index
 */
export interface SyncPlan {
  /** Items to create in target directory */
  toCreate: Array<{ item: SyncItem; targetPath: string }>;
  /** Paths to remove from target (dangling) */
  toRemove: string[];
  /** Items skipped (missing file, etc.) */
  skipped: SkippedItem[];
}

/**
 * Result of executing a sync plan
 */
export interface SyncResult {
  /** Number of items created */
  created: number;
  /** Number of items removed */
  removed: number;
  /** Number of items skipped */
  skipped: number;
  /** Updated sync index */
  newIndex: SyncIndex;
  /** Errors encountered */
  errors: Array<{ item?: SyncItem; path?: string; error: Error }>;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  active: boolean; // Whether sync is enabled
  mode: SyncMode;
  targetPath: string;
  filter: unknown; // ItemFilter from eagle-cooltils
  syncInterval: number;
  syncIndex: SyncIndex;
  lastSyncAt: number | null;
  dirLinkType: DirLinkType;
}
