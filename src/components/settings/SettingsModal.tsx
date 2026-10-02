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
  Camera,
  Info,
  ExternalLink,
  Heart,
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

  const handleOpenGithub = () => {
    const url = 'https://github.com/zreonx';
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="h-full w-full overflow-y-scroll overflow-x-hidden settings-scroll">
      <div className="flex flex-col max-w-3xl mx-auto p-6 space-y-6">
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

      {/* SECTION 4: Webcam Picture-in-Picture Defaults */}
      <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Camera className="w-4 h-4 text-indigo-400" />
          <h3>Webcam Overlay Defaults</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Configure default position and shape when recording with a camera overlay.
        </p>

        {/* Default Shape */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
          <div>
            <div className="text-xs font-medium text-zinc-200">Default Shape</div>
            <div className="text-[11px] text-zinc-500">Circle (Loom/Bandicam style) or Rectangle (16:9 PiP).</div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            {(['circle', 'rectangle'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onUpdateSettings({ cameraShape: s })}
                className={`px-3 py-1 rounded-md text-xs capitalize font-medium transition-colors ${
                  settings?.cameraShape === s
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Default Position */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-xs font-medium text-zinc-200">Default Position</div>
            <div className="text-[11px] text-zinc-500">Corner where the webcam appears.</div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            {(
              [
                { id: 'bottom-right', label: 'Bottom Right' },
                { id: 'bottom-left', label: 'Bottom Left' },
                { id: 'top-right', label: 'Top Right' },
                { id: 'top-left', label: 'Top Left' },
              ] as const
            ).map((pos) => (
              <button
                key={pos.id}
                onClick={() => onUpdateSettings({ cameraPosition: pos.id })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  settings?.cameraPosition === pos.id
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5: Local SQLite Engine Status */}
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

      {/* SECTION 6: About & Developer Information */}
      <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Info className="w-4 h-4 text-blue-400" />
            <h3>About Screenrz</h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-blue-300 border border-zinc-700/60">
            v1.0.0
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          High-performance screen &amp; webcam recorder built for Windows with Bandicam-speed performance, GPU shader compositing, local SQLite storage, and complete offline privacy.
        </p>

        {/* Developer Card */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-500/40 flex items-center justify-center text-white flex-shrink-0 shadow-sm font-bold text-sm">
              Z
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">zreonx</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  Developer
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">github.com/zreonx</p>
            </div>
          </div>

          <button
            onClick={handleOpenGithub}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white text-xs font-medium transition-colors border border-zinc-700 shadow-sm"
          >
            <span>GitHub Profile</span>
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          </button>
        </div>

        {/* Tech Stack Specs */}
        <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 block uppercase">Runtime</span>
            <span className="text-xs text-zinc-300 font-medium">Electron 44</span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 block uppercase">Frontend</span>
            <span className="text-xs text-zinc-300 font-medium">React 19</span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 block uppercase">Compositor</span>
            <span className="text-xs text-zinc-300 font-medium">WebGL GLSL</span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 block uppercase">Database</span>
            <span className="text-xs text-zinc-300 font-medium">node:sqlite</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-zinc-500">
          <span>Crafted with</span>
          <Heart className="w-3 h-3 text-blue-400 fill-blue-400/40 inline" />
          <span>by</span>
          <button
            onClick={handleOpenGithub}
            className="text-zinc-400 hover:text-blue-400 font-medium transition-colors underline underline-offset-2"
          >
            zreonx
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
