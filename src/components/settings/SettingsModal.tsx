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
} from 'lucide-react';
import { AppSettings } from '@/types/electron';

interface SettingsModalProps {
  settings: AppSettings | null;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

type SettingsSection = 'storage' | 'capture' | 'camera' | 'hotkeys' | 'about';

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'capture', label: 'Capture', icon: Sliders },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'hotkeys', label: 'Hotkeys', icon: Keyboard },
  { id: 'about', label: 'About', icon: Database },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 flex items-center px-0.5 ${
        checked ? 'bg-indigo-600' : 'bg-zinc-700'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Row({
  label,
  sub,
  icon: Icon,
  right,
}: {
  label: string;
  sub?: string;
  icon?: React.ElementType;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />}
        <div className="min-w-0">
          <div className="text-xs font-medium text-zinc-200">{label}</div>
          {sub && <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{sub}</div>}
        </div>
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            value === opt.id
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-100 mb-5">{children}</h2>
  );
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('storage');
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
    <div className="flex h-full overflow-hidden">
      {/* ── Left Sidebar Nav ── */}
      <nav className="w-44 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col py-4 px-2 gap-0.5">
        <div className="px-2 pb-3 mb-1 border-b border-zinc-800/60">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Settings
          </div>
        </div>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
              activeSection === id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${activeSection === id ? 'text-indigo-400' : 'text-zinc-500'}`} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Right Content Panel ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl p-8">

          {/* STORAGE */}
          {activeSection === 'storage' && (
            <div>
              <SectionTitle>Recordings Save Directory</SectionTitle>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                All captured screen recordings are saved directly into this local folder. No files are ever uploaded or transmitted across the internet.
              </p>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 truncate min-w-0">
                  {settings?.outputDirectory || 'Loading directory…'}
                </div>
                <button
                  onClick={handleBrowseDirectory}
                  disabled={isChangingDir}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Browse…
                </button>
                <button
                  onClick={handleOpenCurrentFolder}
                  title="Open in Windows File Explorer"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 rounded-xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                <Row
                  label="Auto-Minimize on Record"
                  sub="Automatically hide the window when recording starts — zero UI lag, Bandicam-style."
                  icon={Minimize2}
                  right={
                    <Toggle
                      checked={!!settings?.autoMinimizeOnRecord}
                      onChange={() =>
                        onUpdateSettings({ autoMinimizeOnRecord: !settings?.autoMinimizeOnRecord })
                      }
                    />
                  }
                />
                <Row
                  label="Minimize to System Tray"
                  sub="Hide from the taskbar and live in the Windows notification area next to the clock."
                  icon={Sparkles}
                  right={
                    <Toggle
                      checked={!!settings?.minimizeToTray}
                      onChange={() =>
                        onUpdateSettings({ minimizeToTray: !settings?.minimizeToTray })
                      }
                    />
                  }
                />
              </div>
            </div>
          )}

          {/* CAPTURE */}
          {activeSection === 'capture' && (
            <div>
              <SectionTitle>Video Capture Settings</SectionTitle>

              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                <Row
                  label="Frame Rate"
                  sub="60 FPS provides buttery motion; 30 FPS uses less disk space."
                  right={
                    <SegmentedControl
                      options={[
                        { id: '30', label: '30 FPS' },
                        { id: '60', label: '60 FPS' },
                      ]}
                      value={String(settings?.fps ?? 60) as '30' | '60'}
                      onChange={(v) => onUpdateSettings({ fps: Number(v) })}
                    />
                  }
                />
                <Row
                  label="Encoding Bitrate"
                  sub="Hardware-accelerated encoding quality. Ultra targets 8 Mbps."
                  right={
                    <SegmentedControl
                      options={[
                        { id: 'auto', label: 'Auto' },
                        { id: 'high', label: 'High' },
                        { id: 'ultra', label: 'Ultra' },
                      ]}
                      value={settings?.videoQuality ?? 'high'}
                      onChange={(v) => onUpdateSettings({ videoQuality: v as 'auto' | 'high' | 'ultra' })}
                    />
                  }
                />
              </div>
            </div>
          )}

          {/* CAMERA */}
          {activeSection === 'camera' && (
            <div>
              <SectionTitle>Webcam Overlay Defaults</SectionTitle>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                Configure the default shape and corner position when recording with a webcam overlay.
              </p>

              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
                <Row
                  label="Overlay Shape"
                  sub="Circle (Loom-style) or Rectangle (16:9 PiP)."
                  right={
                    <SegmentedControl
                      options={[
                        { id: 'circle', label: 'Circle' },
                        { id: 'rectangle', label: 'Rectangle' },
                      ]}
                      value={settings?.cameraShape ?? 'circle'}
                      onChange={(v) => onUpdateSettings({ cameraShape: v as 'circle' | 'rectangle' })}
                    />
                  }
                />
                <Row
                  label="Default Corner"
                  sub="Corner where the webcam PiP appears on screen."
                  right={
                    <SegmentedControl
                      options={[
                        { id: 'bottom-right', label: 'BR' },
                        { id: 'bottom-left', label: 'BL' },
                        { id: 'top-right', label: 'TR' },
                        { id: 'top-left', label: 'TL' },
                      ]}
                      value={settings?.cameraPosition ?? 'bottom-right'}
                      onChange={(v) =>
                        onUpdateSettings({
                          cameraPosition: v as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
                        })
                      }
                    />
                  }
                />
              </div>
            </div>
          )}

          {/* HOTKEYS */}
          {activeSection === 'hotkeys' && (
            <div>
              <SectionTitle>Global Background Hotkeys</SectionTitle>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                These hotkeys work system-wide — record seamlessly from games and other applications without switching back to Screenrz.
              </p>

              <div className="space-y-2">
                {[
                  { action: 'Start / Stop Recording', keys: 'F12' },
                  { action: 'Pause / Resume Recording', keys: 'Shift + F12' },
                ].map(({ action, keys }) => (
                  <div
                    key={action}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800"
                  >
                    <span className="text-xs text-zinc-300 font-medium">{action}</span>
                    <kbd className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono font-semibold text-indigo-300">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Active anywhere on Windows — even in full-screen games
              </div>
            </div>
          )}

          {/* ABOUT */}
          {activeSection === 'about' && (
            <div>
              <SectionTitle>Database & App Info</SectionTitle>

              <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
                <div>
                  <div className="text-xs font-medium text-zinc-200 mb-1">Embedded SQLite Database</div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Screenrz stores all recording catalog indexes and preferences locally in an embedded SQLite database
                    (<code className="text-zinc-400">screenrz.db</code>) in your Windows user data directory.
                    No cloud sync, no external servers.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  SQLite: Active &amp; Synchronized
                </div>

                <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-3">
                  {[
                    ['App', 'Screenrz Desktop'],
                    ['Version', '1.0.0'],
                    ['Runtime', 'Electron + React 19'],
                    ['Database', 'node:sqlite (native)'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">{label}</div>
                      <div className="text-xs text-zinc-300">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
