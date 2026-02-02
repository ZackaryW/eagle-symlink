/**
 * Sync library - core logic and executors
 * @module lib
 */

// Types
export type {
  SyncMode,
  DirLinkType,
  SyncIndex,
  SyncItem,
  SkippedItem,
  SyncPlan,
  SyncResult,
  PluginConfig,
} from './types';

// Core functions
export {
  sanitizeFilename,
  generateTargetPath,
  computeSyncPlan,
  buildNewIndex,
} from './core';

// Executors
export {
  ensureTargetDir,
  executePlan,
  isPermissionError,
} from './executors';
export type { ExecuteOptions } from './executors';
