import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, CircleDot } from 'lucide-react';

interface TitleBarProps {
  isRecording?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ isRecording = false }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized);
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    window.electronAPI?.maximizeWindow();
    const max = await window.electronAPI?.isMaximized();
    setIsMaximized(max);
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <header className="h-9 w-full bg-[#09090b] border-b border-[#27272a] flex items-center justify-between select-none app-drag z-50">
      {/* Left: App Logo & Title */}
      <div className="flex items-center gap-2.5 px-3">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
          <CircleDot className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-zinc-300">
          Screenrz
        </span>
        {isRecording && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            REC
          </span>
        )}
      </div>

      {/* Center: Draggable Spacer */}
      <div className="flex-1 h-full" />

      {/* Right: Window Controls */}
      <div className="flex items-center h-full app-no-drag">
        <button
          onClick={handleMinimize}
          title="Minimize"
          className="h-full px-3.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleMaximize}
          title={isMaximized ? 'Restore Down' : 'Maximize'}
          className="h-full px-3.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center"
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 transform rotate-90" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        <button
          onClick={handleClose}
          title="Close"
          className="h-full px-3.5 hover:bg-red-600 hover:text-white text-zinc-400 transition-colors flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
