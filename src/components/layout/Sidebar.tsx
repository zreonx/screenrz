import React from 'react';
import {
  Video,
  Film,
  Settings2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSettings } from '@/types/electron';

export type NavTab = 'studio' | 'library' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  settings: AppSettings | null;
  recordingCount: number;
  isRecording?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  settings,
  recordingCount,
  isRecording = false,
}) => {
  const navItems = [
    {
      id: 'studio' as NavTab,
      label: 'Studio',
      icon: Video,
      badge: null,
    },
    {
      id: 'library' as NavTab,
      label: 'Library',
      icon: Film,
      badge: recordingCount > 0 ? recordingCount : null,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings2,
      badge: null,
    },
  ];

  const handleOpenFolder = () => {
    if (settings?.outputDirectory) {
      window.electronAPI?.openInExplorer(settings.outputDirectory);
    }
  };

  return (
    <aside
      className={cn(
        'h-[calc(100vh-2.25rem)] bg-[#09090b] border-r border-[#27272a] flex flex-col justify-between transition-all duration-200 select-none z-20',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top Section: Nav Links */}
      <div className="p-3 space-y-4">
        {/* Toggle Button */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          {!collapsed && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Overview
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors ml-auto"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isStudioRec = item.id === 'studio' && isRecording;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                )}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors flex-shrink-0',
                      isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    )}
                  />
                  {isStudioRec && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-[#09090b]" />
                  )}
                </div>

                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}

                {!collapsed && isStudioRec && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    REC
                  </span>
                )}

                {!collapsed && !isStudioRec && item.badge !== null && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-zinc-700/60 text-zinc-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Storage & Directory Info */}
      <div className="p-3 border-t border-[#27272a]/70">
        {!collapsed ? (
          <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Save Destination</span>
              </div>
              <button
                onClick={handleOpenFolder}
                title="Open Folder in Explorer"
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>

            <p
              title={settings?.outputDirectory || 'Recordings directory'}
              className="text-[10px] text-zinc-500 font-mono truncate"
            >
              {settings?.outputDirectory || 'Select destination...'}
            </p>
          </div>
        ) : (
          <button
            onClick={handleOpenFolder}
            title={`Open: ${settings?.outputDirectory || 'Recordings'}`}
            className="w-full flex justify-center p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        )}

        {/* Creator Attribution */}
        {!collapsed ? (
          <button
            onClick={() => {
              const url = 'https://github.com/zreonx';
              window.electronAPI?.openExternal?.(url) || window.open(url, '_blank');
            }}
            className="w-full mt-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/80 transition-colors group"
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 fill-current text-zinc-500 group-hover:text-zinc-200 transition-colors" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>By <strong className="font-semibold text-zinc-400 group-hover:text-zinc-200">zreonx</strong></span>
            </div>
            <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </button>
        ) : (
          <button
            onClick={() => {
              const url = 'https://github.com/zreonx';
              window.electronAPI?.openExternal?.(url) || window.open(url, '_blank');
            }}
            title="GitHub: zreonx"
            className="w-full mt-2 flex justify-center p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
};
