/**
 * Sync orchestration hook
 * @module hooks/useSync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { filterItems } from 'eagle-cooltils/universal';
import type { PluginConfig, SyncResult, SyncPlan, SyncItem } from '../lib/types';
import { computeSyncPlan, ensureTargetDir, executePlan, isPermissionError } from '../lib';

// Eagle item interface (from Eagle API)
interface EagleItem {
  id: string;
  name: string;
  ext: string;
  filePath: string;
  tags: string[];
  folders: string[];
  star?: number;
  width: number;
  height: number;
  size: number;
  url: string;
  annotation: string;
  importedAt: number;
  modifiedAt: number;
  isDeleted: boolean;
  [key: string]: unknown;
}

// Declare eagle global (provided by Eagle plugin runtime)
declare const eagle: {
  item: {
    getAll(): Promise<EagleItem[]>;
  };
  library: {
    path: string;
    name: string;
  };
  dialog?: {
    showMessageBox?(options: {
      type: string;
      title: string;
      message: string;
    }): void;
  };
};

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncStats {
  created: number;
  removed: number;
  skipped: number;
  total: number;
  errors: number;
}

interface UseSyncResult {
  status: SyncStatus;
  stats: SyncStats | null;
  lastSyncAt: number | null;
  error: string | null;
  sync: () => Promise<void>;
  isRunning: boolean;
}

/**
 * Hook for sync orchestration
 * 
 * @param config - Plugin configuration
 * @param onIndexUpdate - Callback to update sync index in config
 */
export function useSync(
  config: PluginConfig | null,
  onIndexUpdate: (index: Record<string, string>) => Promise<void>
): UseSyncResult {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);

  // Main sync function
  const sync = useCallback(async () => {
    if (!config || !config.targetPath || isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    setStatus('syncing');
    setError(null);

    try {
      // Ensure target directory exists
      await ensureTargetDir(config.targetPath);

      // Get all items from Eagle
      const allItems = await eagle.item.getAll();

      // Apply filter if conditions exist
      const filterConfig = config.filter as { conditions: unknown[]; match: string } | undefined;
      let filteredItems: EagleItem[] = allItems;
      
      if (filterConfig?.conditions?.length) {
        // filterItems expects FilterableItem[], EagleItem is compatible
        // Use double cast to satisfy TypeScript
        const itemsToFilter = allItems as unknown;
        const filter = filterConfig as unknown;
        filteredItems = filterItems(itemsToFilter as Parameters<typeof filterItems>[0], filter as Parameters<typeof filterItems>[1]) as unknown as EagleItem[];
      }

      // Map to SyncItem format
      const syncItems: SyncItem[] = filteredItems.map(item => ({
        id: item.id,
        name: item.name,
        ext: item.ext,
        filePath: item.filePath,
      }));

      // Compute sync plan
      const plan: SyncPlan = computeSyncPlan(
        syncItems,
        config.syncIndex,
        config.mode,
        config.targetPath
      );

      // Execute plan
      const result: SyncResult = await executePlan(
        plan,
        config.mode,
        config.syncIndex,
        {
          libraryPath: eagle.library.path,
          dirLinkType: config.dirLinkType,
        }
      );

      // Update index
      await onIndexUpdate(result.newIndex);

      // Update stats
      setStats({
        created: result.created,
        removed: result.removed,
        skipped: result.skipped,
        total: Object.keys(result.newIndex).length,
        errors: result.errors.length,
      });

      setLastSyncAt(Date.now());
      setStatus(result.errors.length > 0 ? 'error' : 'success');

      if (result.errors.length > 0) {
        // Check for permission errors
        const permError = result.errors.find(e => isPermissionError(e.error));
        if (permError) {
          setError('Permission denied. Enable Developer Mode in Windows Settings to use symlinks.');
          // Show Eagle dialog
          eagle.dialog?.showMessageBox?.({
            type: 'warning',
            title: 'Permission Required',
            message: 'Enable Developer Mode in Windows Settings to create symlinks.\n\nSettings → Privacy & Security → For developers → Developer Mode',
          });
        } else {
          setError(`${result.errors.length} error(s) during sync`);
        }
      }
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);

      // Check for permission errors
      if (isPermissionError(err)) {
        eagle.dialog?.showMessageBox?.({
          type: 'warning',
          title: 'Permission Required',
          message: 'Enable Developer Mode in Windows Settings to create symlinks.\n\nSettings → Privacy & Security → For developers → Developer Mode',
        });
      }
    } finally {
      isRunningRef.current = false;
    }
  }, [config, onIndexUpdate]);

  // Set up interval
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't set up interval if not active, no config, or no target path
    if (!config?.active || !config?.targetPath || !config?.syncInterval) {
      return;
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      sync();
    }, config.syncInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config?.active, config?.syncInterval, config?.targetPath, sync]);

  // Sync on mount if config exists
  useEffect(() => {
    if (config?.targetPath && config.lastSyncAt) {
      setLastSyncAt(config.lastSyncAt);
      // Calculate stats from existing index
      setStats({
        created: 0,
        removed: 0,
        skipped: 0,
        total: Object.keys(config.syncIndex).length,
        errors: 0,
      });
    }
  }, []);

  return {
    status,
    stats,
    lastSyncAt,
    error,
    sync,
    isRunning: isRunningRef.current,
  };
}
