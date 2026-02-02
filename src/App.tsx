import { useState, useEffect, useCallback } from 'react';
import { useConfig, initConfig, useSync } from './hooks';
import {
  FilterBuilder,
  SyncSettings,
  SyncStatus,
  ConfigModal,
  SettingsButton,
} from './components';
import type { ItemFilter } from './components';
import type { SyncMode, DirLinkType } from './lib/types';

// Declare eagle global
declare const eagle: {
  app: {
    isDarkColors(): boolean;
  };
  library: {
    name: string;
  };
  onPluginCreate(callback: (plugin: { manifest: { id?: string; name?: string } }) => void): void;
  dialog?: {
    showOpenDialog?(options: {
      properties: string[];
      title?: string;
    }): Promise<{ canceled: boolean; filePaths: string[] }>;
  };
};

// ============================================================================
// App Content
// ============================================================================

function AppContent() {
  const { config, loading, error, libraryName, setActive, setMode, setTargetPath, setFilter, setSyncInterval, setDirLinkType, updateSyncIndex, resetConfig } =
    useConfig();
  const { status, stats, lastSyncAt, error: syncError, sync } = useSync(config, updateSyncIndex);

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Sync theme with Eagle
  useEffect(() => {
    try {
      const isDark = eagle.app.isDarkColors();
      setTheme(isDark ? 'dark' : 'light');
    } catch {
      // Not in Eagle environment
    }
  }, []);

  // Handle browse for target directory
  const handleBrowse = useCallback(async () => {
    try {
      const result = await eagle.dialog?.showOpenDialog?.({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Target Directory',
      });
      if (result && !result.canceled && result.filePaths.length > 0) {
        setTargetPath(result.filePaths[0]);
      }
    } catch (err) {
      console.error('Failed to open directory picker:', err);
    }
  }, [setTargetPath]);

  // Handle filter change
  const handleFilterChange = useCallback(
    (filter: ItemFilter) => {
      setFilter(filter);
    },
    [setFilter]
  );

  // Initial sync on config load (only if active)
  useEffect(() => {
    if (config?.active && config?.targetPath && status === 'idle') {
      // Auto-sync on load if active and configured
      sync();
    }
  }, [config?.active, config?.targetPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-base-100" data-theme={theme}>
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-base-100" data-theme={theme}>
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content">
      {/* Header */}
      <header className="px-4 py-3 border-b border-base-300 flex items-center justify-between bg-base-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">Eagle Symlink</h1>
            <p className="text-sm text-base-content/60">{libraryName || 'No library'}</p>
          </div>
          {/* Active Toggle */}
          <div className="form-control">
            <label className="label cursor-pointer gap-2">
              <span className={`text-sm font-medium ${config?.active ? 'text-success' : 'text-base-content/60'}`}>
                {config?.active ? 'Active' : 'Inactive'}
              </span>
              <input
                type="checkbox"
                className="toggle toggle-success"
                checked={config?.active || false}
                onChange={(e) => setActive(e.target.checked)}
              />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SettingsButton onClick={() => setShowConfigModal(true)} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* Sync Settings */}
        <SyncSettings
          mode={config?.mode || 'entry-file'}
          targetPath={config?.targetPath || ''}
          dirLinkType={config?.dirLinkType || 'junction'}
          onModeChange={(mode: SyncMode) => setMode(mode)}
          onTargetPathChange={setTargetPath}
          onDirLinkTypeChange={(type: DirLinkType) => setDirLinkType(type)}
          onBrowse={handleBrowse}
        />

        {/* Filter Builder */}
        <FilterBuilder
          filter={(config?.filter as ItemFilter) || { conditions: [], match: 'AND' }}
          onChange={handleFilterChange}
        />

        {/* Sync Status */}
        <SyncStatus
          status={status}
          stats={stats}
          lastSyncAt={lastSyncAt}
          error={syncError}
          onSync={sync}
          disabled={!config?.targetPath}
          isActive={config?.active || false}
        />
      </main>

      {/* Config Modal */}
      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        syncInterval={config?.syncInterval || 180000}
        onSyncIntervalChange={setSyncInterval}
        onResetConfig={resetConfig}
      />
    </div>
  );
}

// ============================================================================
// App Wrapper
// ============================================================================

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for Eagle plugin to initialize
    if (typeof eagle !== 'undefined' && eagle.onPluginCreate) {
      eagle.onPluginCreate((plugin) => {
        initConfig(plugin);
        setReady(true);
      });
    } else {
      // Development mode without Eagle
      console.warn('Eagle not available, running in dev mode');
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return <AppContent />;
}

export default App;
