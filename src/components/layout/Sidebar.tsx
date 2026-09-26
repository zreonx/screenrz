import React from 'react';
import {
  Video,
  Film,
  Settings2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  HardDrive,
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
      </div>
    </aside>
  );
};
