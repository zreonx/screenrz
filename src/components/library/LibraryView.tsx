import React, { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Play,
  FolderOpen,
  Trash2,
  Clock,
  HardDrive,
  Film,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { RecordingItem } from '@/types/electron';
import { formatDuration, formatBytes } from '@/lib/utils';

interface LibraryViewProps {
  recordings: RecordingItem[];
  onPlayRecording: (recording: RecordingItem) => void;
  onDeleteRecording: (id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  recordings,
  onPlayRecording,
  onDeleteRecording,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter recordings
  const filtered = recordings.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute metrics
  const totalSeconds = recordings.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
  const totalBytes = recordings.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);

  const handleOpenFolder = (filePath: string) => {
    window.electronAPI?.openInExplorer(filePath);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Header & Metrics Strip */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Recording Library
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Local SQLite storage · Zero cloud uploads · Saved to your computer
        </p>

        {/* 3-card metric strip */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Total Clips</p>
              <h3 className="text-base font-semibold text-zinc-100">{recordings.length}</h3>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Recorded Time</p>
              <h3 className="text-base font-semibold text-zinc-100">{formatDuration(totalSeconds)}</h3>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Local Disk Used</p>
              <h3 className="text-base font-semibold text-zinc-100">{formatBytes(totalBytes)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Toggle Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500/70"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === 'grid'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="Table View"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === 'table'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
          <Film className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-sm font-medium text-zinc-300">No recordings found</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {searchQuery
              ? 'Try searching with a different keyword.'
              : 'Head over to the Studio tab to capture your first local video!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden hover:border-zinc-700 transition-all hover:shadow-xl flex flex-col"
            >
              {/* Thumbnail / Video Preview */}
              <div className="relative aspect-video w-full bg-black/40 overflow-hidden flex items-center justify-center">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Film className="w-8 h-8 text-zinc-600" />
                )}

                {/* Duration badge */}
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] font-mono font-medium text-white">
                  {formatDuration(item.durationSeconds)}
                </span>

                {/* Hover Play Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => onPlayRecording(item)}
                    className="p-3 rounded-full bg-white text-zinc-950 hover:scale-110 transition-transform shadow-lg"
                    title="Play Video"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Info Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4
                    title={item.title}
                    className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white"
                  >
                    {item.title}
                  </h4>
                  <p
                    title={item.fileName}
                    className="text-[11px] text-zinc-500 font-mono truncate mt-0.5"
                  >
                    {item.fileName}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{formatBytes(item.fileSize)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenFolder(item.filePath)}
                      title="Show in File Explorer"
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRecording(item.id)}
                      title="Delete recording"
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* DATA TABLE VIEW */
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Title</th>
                <th className="py-2.5 px-4 font-semibold">Duration</th>
                <th className="py-2.5 px-4 font-semibold">Size</th>
                <th className="py-2.5 px-4 font-semibold">Created</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                  onClick={() => onPlayRecording(item)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-400">
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <div className="truncate max-w-xs">
                        <div className="font-medium text-zinc-100 truncate">{item.title}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                          {item.fileName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">
                    {formatDuration(item.durationSeconds)}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-400">
                    {formatBytes(item.fileSize)}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenFolder(item.filePath)}
                        title="Show in File Explorer"
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRecording(item.id)}
                        title="Delete recording"
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
