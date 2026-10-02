import React from 'react';
import {
  ExternalLink,
  Heart,
  Cpu,
  ShieldCheck,
  Zap,
  HardDrive,
  Keyboard,
  Layers,
  Code2,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { AppSettings } from '@/types/electron';
import appIcon from '@/assets/icon.png';

interface AboutViewProps {
  settings: AppSettings | null;
}

export const AboutView: React.FC<AboutViewProps> = ({ settings }) => {
  const handleOpenGithub = () => {
    const url = 'https://github.com/zreonx';
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenFolder = () => {
    if (settings?.outputDirectory) {
      window.electronAPI?.openInExplorer(settings.outputDirectory);
    }
  };

  return (
    <div className="h-full w-full overflow-y-scroll overflow-x-hidden settings-scroll">
      <div className="flex flex-col max-w-3xl mx-auto p-6 space-y-6">
        {/* Hero Section with Blue Screenrz Logo */}
        <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-blue-950/30 via-zinc-900/60 to-zinc-950/80 border border-blue-500/20 overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
            {/* Blue & White Screenrz App Icon */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xl shadow-blue-600/20">
              <img
                src={appIcon}
                alt="Screenrz Desktop"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Screenrz Desktop
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  v1.0.0
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Stable Release
                </span>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">
                Ultra-fast, minimal desktop screen and webcam recorder engineered with Bandicam-speed performance, hardware-accelerated WebGL compositing, built-in SQLite indexing, and strict offline privacy.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  100% Offline &amp; Private
                </span>
                <span className="flex items-center gap-1 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/60">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  60 FPS Zero-Drop GPU Pipeline
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Attribution Card */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Developer &amp; Creator
            </span>
            <span className="text-[11px] text-zinc-500">Open Source MIT License</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-lg">
                Z
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">zreonx</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    Author
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  github.com/zreonx
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenGithub}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md hover:shadow-blue-500/20"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>Visit GitHub Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Architecture & Tech Stack Details */}
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            System Architecture
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>WebGL Compositing Engine</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct GLSL fragment shader pipeline composites screen capture and webcam picture-in-picture at fixed 60 FPS with zero CPU software blending overhead.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>Embedded SQLite Database</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Powered by Node 22 native <code className="text-zinc-300 font-mono text-[11px]">node:sqlite</code> with WAL (Write-Ahead Logging) mode for instant catalog searches and persistent settings.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <Keyboard className="w-4 h-4 text-indigo-400" />
                <span>Global System Shortcuts</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seamless <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-200 font-mono">F12</kbd> (Start/Stop) and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-200 font-mono">Shift+F12</kbd> (Pause/Resume) hotkeys registered system-wide.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Modern Frontend Stack</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Built with React 19, Tailwind CSS, Lucide icons, and Electron 44 for buttery-smooth animations and responsiveness.
              </p>
            </div>
          </div>
        </div>

        {/* Storage Location Card */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-200 block">
                Local Recordings Vault
              </span>
              <span className="text-[11px] text-zinc-400 font-mono truncate max-w-sm block">
                {settings?.outputDirectory || 'Loading save path...'}
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenFolder}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 hover:text-white transition-colors border border-zinc-700 shadow-xs"
          >
            Open Folder
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center text-xs text-zinc-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-blue-400 fill-blue-400/40 inline" />
            <span>by</span>
            <button
              onClick={handleOpenGithub}
              className="text-zinc-400 hover:text-blue-400 font-medium transition-colors underline underline-offset-2"
            >
              zreonx
            </button>
          </p>
          <p className="text-[11px] text-zinc-600 font-mono">
            Screenrz Desktop • Built for Windows
          </p>
        </div>
      </div>
    </div>
  );
};
