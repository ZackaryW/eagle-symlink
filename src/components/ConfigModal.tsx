/**
 * ConfigModal component - Advanced settings modal
 */

import { useState, useEffect } from 'react';

// ============================================================================
// Icons
// ============================================================================

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncInterval: number;
  onSyncIntervalChange: (interval: number) => void;
  onResetConfig: () => void;
}

export function ConfigModal({
  isOpen,
  onClose,
  syncInterval,
  onSyncIntervalChange,
  onResetConfig,
}: ConfigModalProps) {
  const [localInterval, setLocalInterval] = useState(syncInterval / 60000); // Convert to minutes
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setLocalInterval(syncInterval / 60000);
  }, [syncInterval]);

  const handleSave = () => {
    onSyncIntervalChange(localInterval * 60000); // Convert back to ms
    onClose();
  };

  const handleReset = () => {
    onResetConfig();
    setShowResetConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg flex items-center gap-2">
          <SettingsIcon />
          Advanced Settings
        </h3>

        <div className="py-4 space-y-4">
          {/* Sync Interval */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Auto-sync Interval</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="input input-bordered w-24"
                min={1}
                max={60}
                value={localInterval}
                onChange={(e) => setLocalInterval(Math.max(1, Number(e.target.value)))}
              />
              <span className="text-sm">minutes</span>
            </div>
            <label className="label">
              <span className="label-text-alt">
                Plugin will automatically sync every {localInterval} minute{localInterval !== 1 ? 's' : ''}
              </span>
            </label>
          </div>

          {/* Info */}
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm">
              Configuration is stored per-library using a unique ID, so it persists even if you move or rename your library.
            </span>
          </div>

          {/* Danger Zone */}
          <div className="divider">Danger Zone</div>
          
          {!showResetConfirm ? (
            <div className="flex items-center justify-between p-3 border border-error/30 rounded-lg bg-error/5">
              <div>
                <p className="font-medium text-error">Reset Configuration</p>
                <p className="text-sm text-base-content/60">Clear all settings and sync index for this library</p>
              </div>
              <button 
                className="btn btn-error btn-sm btn-outline"
                onClick={() => setShowResetConfirm(true)}
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="p-3 border border-error rounded-lg bg-error/10">
              <p className="font-medium text-error mb-2">Are you sure?</p>
              <p className="text-sm text-base-content/70 mb-3">
                This will reset all plugin settings to defaults and clear the sync index. 
                Synced files in the target directory will NOT be deleted.
              </p>
              <div className="flex gap-2 justify-end">
                <button 
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-sm btn-error"
                  onClick={handleReset}
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Settings Button
// ============================================================================

interface SettingsButtonProps {
  onClick: () => void;
}

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      className="btn btn-ghost btn-sm btn-square"
      onClick={onClick}
      title="Advanced Settings"
    >
      <SettingsIcon />
    </button>
  );
}
