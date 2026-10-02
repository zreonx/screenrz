import React, { useState } from 'react';
import {
  FolderOpen,
  HardDrive,
  Sliders,
  Minimize2,
  Keyboard,
  Sparkles,
  Camera,
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
  const [customFps, setCustomFps] = useState<string>(String(settings?.fps || 60));
  const [customBitrate, setCustomBitrate] = useState<string>(
    String(settings?.customBitrateMbps || 4.0)
  );

  React.useEffect(() => {
    if (settings?.fps) {
      setCustomFps(String(settings.fps));
    }
  }, [settings?.fps]);

  React.useEffect(() => {
    if (settings?.customBitrateMbps) {
      setCustomBitrate(String(settings.customBitrateMbps));
    }
  }, [settings?.customBitrateMbps]);

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
    <div className="h-full w-full overflow-y-scroll overflow-x-hidden settings-scroll">
      <div className="flex flex-col max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Settings & Preferences
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure local recording storage paths and hardware capture parameters.
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
        <div className="py-3 border-b border-zinc-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
                <span>Frame Rate (FPS)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                  {settings?.fps || 60} FPS (~{(1000 / (settings?.fps || 60)).toFixed(1)} ms/frame)
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Choose a broadcast preset or specify a custom framerate (10 – 240 FPS).
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800 self-start sm:self-auto">
              {[24, 30, 60, 120, 144].map((fpsVal) => (
                <button
                  key={fpsVal}
                  type="button"
                  onClick={() => {
                    setCustomFps(String(fpsVal));
                    onUpdateSettings({ fps: fpsVal });
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    settings?.fps === fpsVal
                      ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {fpsVal}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Slider & Direct Number Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/80">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Custom FPS Slider</span>
                <span className="font-mono text-zinc-300 font-semibold">{settings?.fps || 60} FPS</span>
              </div>
              <input
                type="range"
                min={10}
                max={240}
                step={1}
                value={settings?.fps || 60}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCustomFps(String(val));
                  onUpdateSettings({ fps: val });
                }}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>10</span>
                <span>30</span>
                <span>60</span>
                <span>120</span>
                <span>144</span>
                <span>240</span>
              </div>
            </div>

            <div className="hidden sm:block h-10 w-[1px] bg-zinc-800" />

            <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                Custom FPS
              </label>
              <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-700/80 px-2.5 py-1 focus-within:border-indigo-500">
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={customFps}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCustomFps(raw);
                    const parsed = parseInt(raw, 10);
                    if (!isNaN(parsed) && parsed >= 10 && parsed <= 240) {
                      onUpdateSettings({ fps: parsed });
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(customFps, 10);
                    if (isNaN(parsed) || parsed < 10) {
                      setCustomFps('10');
                      onUpdateSettings({ fps: 10 });
                    } else if (parsed > 240) {
                      setCustomFps('240');
                      onUpdateSettings({ fps: 240 });
                    }
                  }}
                  className="w-14 bg-transparent text-xs text-right font-mono font-bold text-zinc-100 focus:outline-hidden"
                />
                <span className="text-[11px] font-mono text-zinc-400 ml-1.5 font-medium">FPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Quality & Compression (File Size Control) */}
        <div className="py-3 border-b border-zinc-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
                <span>Encoding Quality &amp; Compression</span>
                {settings?.videoQuality === 'compact' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
                    ~50% Smaller Files
                  </span>
                )}
                {(!settings?.videoQuality || settings?.videoQuality === 'adaptive' || settings?.videoQuality === 'auto') && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                    Smart Adaptive (Balanced)
                  </span>
                )}
                {settings?.videoQuality === 'high' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold">
                    High Bitrate (~6 Mbps)
                  </span>
                )}
                {settings?.videoQuality === 'ultra' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold">
                    Maximum (~10 Mbps)
                  </span>
                )}
                {settings?.videoQuality === 'custom' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold">
                    Custom ({settings?.customBitrateMbps || 4} Mbps)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {settings?.videoQuality === 'compact'
                  ? 'Space Saver: High-efficiency compression keeps text razor-sharp while reducing file size by up to 50-60%.'
                  : settings?.videoQuality === 'high'
                  ? 'High Bitrate: Ideal for motion graphics and fast-paced screencasts.'
                  : settings?.videoQuality === 'ultra'
                  ? 'Maximum Quality: Uncompressed bitrate ideal for 3D gaming.'
                  : settings?.videoQuality === 'custom'
                  ? 'Custom Bitrate: Manual bandwidth target for fine-tuned export sizes.'
                  : 'Smart Adaptive: Dynamically adjusts bitrate based on resolution and FPS to guarantee pristine text with reduced file sizes.'}
              </div>
            </div>

            {/* Quality Preset Buttons */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800 self-start sm:self-auto flex-wrap">
              {[
                { id: 'compact', label: 'Space Saver' },
                { id: 'adaptive', label: 'Smart Adaptive' },
                { id: 'high', label: 'High' },
                { id: 'ultra', label: 'Ultra' },
                { id: 'custom', label: 'Custom' },
              ].map((q) => {
                const isActive =
                  settings?.videoQuality === q.id ||
                  (q.id === 'adaptive' && (!settings?.videoQuality || settings?.videoQuality === 'auto'));
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onUpdateSettings({ videoQuality: q.id as any })}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* If Custom is selected, show Slider and Input */}
          {settings?.videoQuality === 'custom' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Custom Bitrate Slider</span>
                  <span className="font-mono text-zinc-300 font-semibold">{settings?.customBitrateMbps || 4.0} Mbps</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={20.0}
                  step={0.5}
                  value={settings?.customBitrateMbps || 4.0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomBitrate(String(val));
                    onUpdateSettings({ customBitrateMbps: val });
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                  <span>1.0 Mbps (Tiny)</span>
                  <span>4.0</span>
                  <span>8.0</span>
                  <span>14.0</span>
                  <span>20.0 Mbps (Lossless)</span>
                </div>
              </div>

              <div className="hidden sm:block h-10 w-[1px] bg-zinc-800" />

              <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Bitrate Target
                </label>
                <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-700/80 px-2.5 py-1 focus-within:border-indigo-500">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={0.5}
                    value={customBitrate}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCustomBitrate(raw);
                      const parsed = parseFloat(raw);
                      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 30) {
                        onUpdateSettings({ customBitrateMbps: parsed });
                      }
                    }}
                    onBlur={() => {
                      const parsed = parseFloat(customBitrate);
                      if (isNaN(parsed) || parsed < 1.0) {
                        setCustomBitrate('1.0');
                        onUpdateSettings({ customBitrateMbps: 1.0 });
                      } else if (parsed > 30.0) {
                        setCustomBitrate('30.0');
                        onUpdateSettings({ customBitrateMbps: 30.0 });
                      }
                    }}
                    className="w-14 bg-transparent text-xs text-right font-mono font-bold text-zinc-100 focus:outline-hidden"
                  />
                  <span className="text-[11px] font-mono text-zinc-400 ml-1.5 font-medium">Mbps</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Output Video Format & Extension */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
          <div>
            <div className="text-xs font-medium text-zinc-200">Video Format &amp; Extension</div>
            <div className="text-[11px] text-zinc-500">
              MP4 is universally playable on iPhone, Mac, Windows, TVs, and editing software.
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            {(
              [
                { id: 'mp4', label: 'MP4 (.mp4)' },
                { id: 'webm', label: 'WebM (.webm)' },
              ] as const
            ).map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => onUpdateSettings({ videoFormat: fmt.id })}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  (settings?.videoFormat || 'mp4') === fmt.id
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {fmt.label}
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
      </div>
    </div>
  );
};
