/**
 * SyncSettings component - Mode and target path configuration
 */

import type { SyncMode, DirLinkType } from '../lib/types';

// ============================================================================
// Icons
// ============================================================================

const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

interface SyncSettingsProps {
  mode: SyncMode;
  targetPath: string;
  dirLinkType: DirLinkType;
  onModeChange: (mode: SyncMode) => void;
  onTargetPathChange: (path: string) => void;
  onDirLinkTypeChange: (type: DirLinkType) => void;
  onBrowse: () => void;
}

export function SyncSettings({
  mode,
  targetPath,
  dirLinkType,
  onModeChange,
  onTargetPathChange,
  onDirLinkTypeChange,
  onBrowse,
}: SyncSettingsProps) {
  return (
    <div className="bg-base-200 rounded-xl p-4 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <FolderIcon />
        Sync Settings
      </h2>

      {/* Mode Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Sync Mode</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <label className="label cursor-pointer gap-2 bg-base-100 rounded-lg px-3 py-2">
            <input
              type="radio"
              name="mode"
              className="radio radio-primary radio-sm"
              checked={mode === 'entry-dir'}
              onChange={() => onModeChange('entry-dir')}
            />
            <div>
              <span className="label-text font-medium">Entry Directory</span>
              <p className="text-xs text-base-content/60">Symlink .info folders</p>
            </div>
          </label>
          <label className="label cursor-pointer gap-2 bg-base-100 rounded-lg px-3 py-2">
            <input
              type="radio"
              name="mode"
              className="radio radio-primary radio-sm"
              checked={mode === 'entry-file'}
              onChange={() => onModeChange('entry-file')}
            />
            <div>
              <span className="label-text font-medium">Entry File</span>
              <p className="text-xs text-base-content/60">Symlink files only</p>
            </div>
          </label>
          <label className="label cursor-pointer gap-2 bg-base-100 rounded-lg px-3 py-2">
            <input
              type="radio"
              name="mode"
              className="radio radio-primary radio-sm"
              checked={mode === 'copy'}
              onChange={() => onModeChange('copy')}
            />
            <div>
              <span className="label-text font-medium">Copy</span>
              <p className="text-xs text-base-content/60">Copy files (no symlinks)</p>
            </div>
          </label>
        </div>
      </div>

      {/* Directory Link Type (only for entry-dir mode) */}
      {mode === 'entry-dir' && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Link Type</span>
          </label>
          <select
            className="select select-bordered select-sm w-full max-w-xs"
            value={dirLinkType}
            onChange={(e) => onDirLinkTypeChange(e.target.value as DirLinkType)}
          >
            <option value="junction">Junction (no admin required)</option>
            <option value="dir">Symlink (requires Developer Mode)</option>
          </select>
        </div>
      )}

      {/* Target Path */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Target Directory</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder="C:\MyLinks\Eagle"
            value={targetPath}
            onChange={(e) => onTargetPathChange(e.target.value)}
          />
          <button className="btn btn-outline" onClick={onBrowse}>
            Browse...
          </button>
        </div>
        {!targetPath && (
          <label className="label">
            <span className="label-text-alt text-warning">Please set a target directory</span>
          </label>
        )}
      </div>
    </div>
  );
}
