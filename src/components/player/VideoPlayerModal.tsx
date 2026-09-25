import React, { useRef } from 'react';
import { X, FolderOpen, ExternalLink } from 'lucide-react';
import { RecordingItem } from '@/types/electron';
import { formatBytes, formatDuration } from '@/lib/utils';

interface VideoPlayerModalProps {
  recording: RecordingItem | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  recording,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!recording) return null;

  // Format file URI for local playback
  const fileUri = `file://${recording.filePath.replace(/\\/g, '/')}`;

  const handleOpenFolder = () => {
    window.electronAPI?.openInExplorer(recording.filePath);
  };

  const handleOpenWithSystem = () => {
    window.electronAPI?.openPath(recording.filePath);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-[#121215] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 truncate max-w-md">
              {recording.title}
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              {formatDuration(recording.durationSeconds)} · {formatBytes(recording.fileSize)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenWithSystem}
              title="Play in Default Windows Player"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              System Player
            </button>
            <button
              onClick={handleOpenFolder}
              title="Show in File Explorer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={fileUri}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
};
