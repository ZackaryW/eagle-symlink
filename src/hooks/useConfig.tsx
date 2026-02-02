/**
 * Config management hook
 * @module hooks/useConfig
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initEagleConfig,
  createLibraryUuidPluginConfig,
} from 'eagle-cooltils/universal';
import type { PluginConfig, SyncIndex, SyncMode, DirLinkType } from '../lib/types';

// Declare eagle global for library access
declare const eagle: {
  library?: {
    name: string;
    path: string;
    info(): Promise<{ name: string; path: string }>;
  };
  os?: {
    homedir(): string;
  };
  onLibraryChanged?(callback: (libraryPath: string) => void): void;
};

// Get default target path (~/.eaglecooler/symlink)
function getDefaultTargetPath(): string {
  try {
    const home = eagle?.os?.homedir?.() 
      || process.env.HOME 
      || process.env.USERPROFILE 
      || '';
    if (home) {
      return `${home}/.eaglecooler/symlink`.replace(/\\/g, '/');
    }
  } catch {
    // Fallback
  }
  return '';
}

// Default configuration values
const DEFAULT_CONFIG: PluginConfig = {
  active: false, // Disabled by default until user configures
  mode: 'entry-file',
  targetPath: getDefaultTargetPath(),
  filter: { conditions: [], match: 'AND' },
  syncInterval: 180000, // 3 minutes
  syncIndex: {} as SyncIndex,
  lastSyncAt: null,
  dirLinkType: 'junction',
};

// Create config instance (uses library UUID for portable storage)
let configInstance: ReturnType<typeof createLibraryUuidPluginConfig> | null = null;

/**
 * Initialize config system - call in onPluginCreate
 */
export function initConfig(plugin: { manifest: { id?: string; name?: string } }) {
  initEagleConfig(plugin);
  configInstance = createLibraryUuidPluginConfig();
}

/**
 * Re-initialize config for current library
 */
function reinitConfigInstance() {
  configInstance = createLibraryUuidPluginConfig();
}

/**
 * Hook for managing plugin configuration
 */
export function useConfig() {
  const [config, setConfigState] = useState<PluginConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [libraryName, setLibraryName] = useState<string>('');

  // Load config from current library
  const loadConfig = useCallback(async () => {
    if (!configInstance) {
      setError('Config not initialized. Call initConfig() first.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stored = await configInstance.getAll();
      
      // Merge with defaults for any missing fields
      const merged: PluginConfig = {
        ...DEFAULT_CONFIG,
        ...(stored as Partial<PluginConfig>),
        // Ensure nested objects are properly merged
        filter: (stored as Partial<PluginConfig>).filter ?? DEFAULT_CONFIG.filter,
        syncIndex: ((stored as Partial<PluginConfig>).syncIndex ?? {}) as SyncIndex,
      };

      setConfigState(merged);
      
      // Update library name using eagle.library.info() for reliability
      try {
        const info = await eagle?.library?.info();
        setLibraryName(info?.name || '');
      } catch {
        // Fallback to direct property access
        setLibraryName(eagle?.library?.name || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh function (reinit config instance + reload)
  const refresh = useCallback(async () => {
    reinitConfigInstance();
    await loadConfig();
  }, [loadConfig]);

  // Initial load
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Subscribe to library changes using Eagle's native API
  useEffect(() => {
    if (!eagle?.onLibraryChanged) {
      console.warn('[useConfig] eagle.onLibraryChanged not available');
      return;
    }

    eagle.onLibraryChanged(async (libraryPath) => {
      console.log('[useConfig] Library changed to:', libraryPath);
      
      // Use eagle.library.info() to get library details
      try {
        const info = await eagle.library?.info();
        console.log('[useConfig] Library info:', info?.name);
        
        // Refresh config for new library
        await refresh();
      } catch (err) {
        console.error('[useConfig] Failed to get library info:', err);
        // Still try to refresh
        await refresh();
      }
    });

    // Note: eagle.onLibraryChanged doesn't return an unsubscribe function
  }, [refresh]);

  const setConfig = useCallback(async (updates: Partial<PluginConfig>) => {
    if (!configInstance || !config) return;

    try {
      const newConfig = { ...config, ...updates };
      await configInstance.setMany(newConfig as Record<string, unknown>);
      setConfigState(newConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
      throw err;
    }
  }, [config]);

  const setActive = useCallback((active: boolean) => setConfig({ active }), [setConfig]);
  const setMode = useCallback((mode: SyncMode) => setConfig({ mode }), [setConfig]);
  const setTargetPath = useCallback((targetPath: string) => setConfig({ targetPath }), [setConfig]);
  const setFilter = useCallback((filter: unknown) => setConfig({ filter }), [setConfig]);
  const setSyncInterval = useCallback((syncInterval: number) => setConfig({ syncInterval }), [setConfig]);
  const setDirLinkType = useCallback((dirLinkType: DirLinkType) => setConfig({ dirLinkType }), [setConfig]);

  const updateSyncIndex = useCallback(async (syncIndex: SyncIndex) => {
    await setConfig({ syncIndex, lastSyncAt: Date.now() });
  }, [setConfig]);

  const resetConfig = useCallback(async () => {
    if (!configInstance) return;
    await configInstance.clear();
    setConfigState(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    loading,
    error,
    libraryName,
    setConfig,
    setActive,
    setMode,
    setTargetPath,
    setFilter,
    setSyncInterval,
    setDirLinkType,
    updateSyncIndex,
    resetConfig,
    reload: loadConfig,
    refresh,
  };
}

export { DEFAULT_CONFIG };
