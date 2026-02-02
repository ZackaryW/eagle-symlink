/**
 * SyncStatus component - Status bar and sync controls
 */

import type { SyncStatus as SyncStatusType, SyncStats } from '../hooks/useSync';

// ============================================================================
// Icons
// ============================================================================

const SyncIcon = ({ spinning = false }: { spinning?: boolean }) => (
  <svg 
    className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ============================================================================
// Helpers
// ============================================================================

function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  return `${Math.floor(seconds / 3600)} hours ago`;
}

// ============================================================================
// Component
// ============================================================================

interface SyncStatusProps {
  status: SyncStatusType;
  stats: SyncStats | null;
  lastSyncAt: number | null;
  error: string | null;
  onSync: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function SyncStatus({
  status,
  stats,
  lastSyncAt,
  error,
  onSync,
  disabled = false,
  isActive = true,
}: SyncStatusProps) {
  const isSyncing = status === 'syncing';

  return (
    <div className={`bg-base-200 rounded-xl p-4 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        {/* Status Info */}
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          {!isActive && <SyncIcon />}
          {isActive && status === 'idle' && <SyncIcon />}
          {isActive && status === 'syncing' && <SyncIcon spinning />}
          {isActive && status === 'success' && <CheckIcon />}
          {isActive && status === 'error' && <ErrorIcon />}

          {/* Status Text */}
          <div>
            {!isActive && (
              <p className="font-medium text-base-content/60">Sync disabled</p>
            )}
            {isActive && status === 'idle' && (
              <p className="font-medium">Ready to sync</p>
            )}
            {isActive && status === 'syncing' && (
              <p className="font-medium">Syncing...</p>
            )}
            {isActive && status === 'success' && stats && (
              <p className="font-medium">
                {stats.total} items synced
                {(stats.created > 0 || stats.removed > 0) && (
                  <span className="text-sm font-normal text-base-content/60 ml-2">
                    ({stats.created > 0 && `+${stats.created}`}
                    {stats.created > 0 && stats.removed > 0 && ', '}
                    {stats.removed > 0 && `-${stats.removed}`})
                  </span>
                )}
              </p>
            )}
            {isActive && status === 'error' && (
              <p className="font-medium text-error">Sync failed</p>
            )}
            
            {/* Last sync time */}
            <p className="text-sm text-base-content/60">
              {isActive ? `Last sync: ${formatTimeAgo(lastSyncAt)}` : 'Enable sync to start'}
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <button
          className={`btn ${isSyncing ? 'btn-disabled' : 'btn-primary'}`}
          onClick={onSync}
          disabled={disabled || isSyncing}
        >
          <SyncIcon spinning={isSyncing} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mt-3">
          <ErrorIcon />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Details */}
      {stats && status !== 'idle' && (
        <div className="flex gap-4 mt-3 text-sm">
          <div className="badge badge-outline">Total: {stats.total}</div>
          {stats.created > 0 && <div className="badge badge-success badge-outline">Created: {stats.created}</div>}
          {stats.removed > 0 && <div className="badge badge-warning badge-outline">Removed: {stats.removed}</div>}
          {stats.skipped > 0 && <div className="badge badge-ghost">Skipped: {stats.skipped}</div>}
          {stats.errors > 0 && <div className="badge badge-error badge-outline">Errors: {stats.errors}</div>}
        </div>
      )}
    </div>
  );
}
