import React, { useState } from 'react';
import {
  FolderOpen,
  HardDrive,
  Database,
  Sliders,
  Check,
  Minimize2,
  Keyboard,
  Sparkles,
} from 'lucide-react';
import { AppSettings } from '@/types/electron';

interface SettingsModalProps {
  settings: AppSettings | null;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [isChangingDir, setIsChangingDir] = useState(false);

  const handleBrowseDirectory = async () => {
    setIsChangingDir(true);
    try {
      const selected = await window.electronAPI?.selectDirectory();
      if (selected) {
        onUpdateSettings({ outputDirectory: selected });
      }
    } finally {
      setIsChangingDir(false);
    }
  };

  const handleOpenCurrentFolder = () => {
    if (settings?.outputDirectory) {
      window.electronAPI?.openInExplorer(settings.outputDirectory);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Settings & Preferences
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure local recording storage paths, hardware capture parameters, and SQLite storage.
        </p>
      </div>

      {/* SECTION 1: Local Storage Directory */}
      <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <h3>Recordings Save Directory</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          All captured screen recordings are saved directly into this local folder. No files are ever uploaded or transmitted across the internet.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 truncate">
            {settings?.outputDirectory || 'Loading directory...'}
          </div>
          <button
            onClick={handleBrowseDirectory}
            disabled={isChangingDir}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Browse...
          </button>
          <button
            onClick={handleOpenCurrentFolder}
            title="Open in Windows File Explorer"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECTION 2: Global Bandicam-style Hotkeys */}
      <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <h3>Global Background Hotkeys</h3>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            Active Anywhere
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Record seamlessly in background games and applications without switching back to Screenrz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <span className="text-xs text-zinc-300 font-medium">Start / Stop Recording</span>
            <kbd className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono font-semibold text-indigo-300 shadow-xs">
              F12
            </kbd>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <span className="text-xs text-zinc-300 font-medium">Pause / Resume Recording</span>
            <kbd className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono font-semibold text-indigo-300 shadow-xs">
              Shift + F12
            </kbd>
          </div>
        </div>
      </div>

      {/* SECTION 3: Video Performance & FPS */}
      <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3>Video Capture Settings</h3>
        </div>

        {/* Framerate Selection */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
          <div>
            <div className="text-xs font-medium text-zinc-200">Frame Rate (FPS)</div>
            <div className="text-[11px] text-zinc-500">60 FPS provides smooth motion, 30 FPS uses less disk space.</div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            {[30, 60].map((fpsVal) => (
              <button
                key={fpsVal}
                onClick={() => onUpdateSettings({ fps: fpsVal })}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  settings?.fps === fpsVal
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {fpsVal} FPS
              </button>
            ))}
          </div>
        </div>

        {/* Video Quality Bitrate */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
          <div>
            <div className="text-xs font-medium text-zinc-200">Encoding Bitrate</div>
            <div className="text-[11px] text-zinc-500">Hardware accelerated encoding quality.</div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            {(['auto', 'high', 'ultra'] as const).map((q) => (
              <button
                key={q}
                onClick={() => onUpdateSettings({ videoQuality: q })}
                className={`px-3 py-1 rounded-md text-xs capitalize font-medium transition-colors ${
                  settings?.videoQuality === q
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Minimize (Bandicam Mode) */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <Minimize2 className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-xs font-medium text-zinc-200">Auto-Minimize on Record (Bandicam Mode)</div>
              <div className="text-[11px] text-zinc-500">Automatically drop to background when recording starts for 0% UI lag.</div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ autoMinimizeOnRecord: !settings?.autoMinimizeOnRecord })}
            className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              settings?.autoMinimizeOnRecord ? 'bg-indigo-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings?.autoMinimizeOnRecord ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Minimize to Windows System Tray / Status Bar */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-xs font-medium text-zinc-200">Minimize to Windows System Tray</div>
              <div className="text-[11px] text-zinc-500">Hide from taskbar and live in the Windows notification status area next to the clock.</div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ minimizeToTray: !settings?.minimizeToTray })}
            className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              settings?.minimizeToTray ? 'bg-indigo-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings?.minimizeToTray ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* SECTION 4: Local SQLite Engine Status */}
      <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3>Embedded SQLite Database</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Screenrz stores catalog indexes and preferences locally in an embedded SQLite database (`screenrz.db`) in your user data directory.
        </p>
        <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-medium">
          <Check className="w-3.5 h-3.5" />
          SQLite Database: Active & Synchronized
        </div>
      </div>
    </div>
  );
};
