import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import { RecordingItem } from '@/types/electron';
import { formatBytes, formatDuration } from '@/lib/utils';

interface VideoPlayerModalProps {
  recording: RecordingItem | null;
  onClose: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  recording,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showCenterRipple, setShowCenterRipple] = useState<'play' | 'pause' | null>(null);

  const controlsTimeoutRef = useRef<any>(null);

  // Initialize duration from recording item metadata (fixes Chromium WebM duration Infinity bug)
  useEffect(() => {
    if (recording) {
      setDuration(recording.durationSeconds || 0);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [recording]);

  // Construct streaming URI (uses our HTTP 206 byte-range media:// protocol for hardware decoding)
  const videoSrc = recording
    ? `media://local/${recording.filePath.replace(/\\/g, '/')}`
    : '';

  // Auto-hide controls timer
  const triggerControlsVisibility = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isScrubbing) {
        setShowControls(false);
      }
    }, 2500);
  }, [isPlaying, isScrubbing]);

  const handleMouseMove = () => {
    triggerControlsVisibility();
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setShowCenterRipple('play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowCenterRipple('pause');
    }
    setTimeout(() => setShowCenterRipple(null), 500);
    triggerControlsVisibility();
  }, [triggerControlsVisibility]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbing) return;
    setCurrentTime(videoRef.current.currentTime);

    // If duration wasn't known from metadata, pick it up from video element
    if (
      (!duration || duration === 0 || !isFinite(duration)) &&
      videoRef.current.duration &&
      isFinite(videoRef.current.duration)
    ) {
      setDuration(videoRef.current.duration);
    }

    // Update buffered progress
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const total = duration || videoRef.current.duration || 1;
      setBufferedPercent(Math.min(100, (bufferedEnd / total) * 100));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      if (isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const effectiveDur = duration || (videoRef.current.duration > 0 ? videoRef.current.duration : 9999);
    const target = Math.max(0, Math.min(effectiveDur, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    triggerControlsVisibility();
  };

  // Smooth Scrubber seek handlers
  const handleScrubStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleScrubMove(e);
  };

  const handleScrubMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (!progressTrackRef.current || !videoRef.current) return;
      const rect = progressTrackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, (e as MouseEvent).clientX - rect.left));
      const percentage = clickX / rect.width;
      const targetTime = percentage * (duration || videoRef.current.duration || 1);

      setCurrentTime(targetTime);
      videoRef.current.currentTime = targetTime;
    },
    [duration]
  );

  const handleScrubEnd = useCallback(() => {
    setIsScrubbing(false);
    triggerControlsVisibility();
  }, [triggerControlsVisibility]);

  useEffect(() => {
    const onMouseUp = () => {
      if (isScrubbing) handleScrubEnd();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isScrubbing) handleScrubMove(e);
    };

    if (isScrubbing) {
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mousemove', onMouseMove);
    }
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isScrubbing, handleScrubEnd, handleScrubMove]);

  // Volume
  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    videoRef.current.volume = clamped;
    setIsMuted(clamped === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Playback Rate
  const cyclePlaybackRate = () => {
    if (!videoRef.current) return;
    const nextIdx = (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length;
    const newRate = PLAYBACK_RATES[nextIdx];
    videoRef.current.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (!document.fullscreenElement) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, volume, isMuted, onClose]);

  if (!recording) return null;

  const currentPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8 select-none animate-in fade-in duration-150">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full max-w-5xl bg-[#09090b] border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col group"
      >
        {/* Top Control Bar (Fades out when playing) */}
        <div
          className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 truncate max-w-lg">
              {recording.title}
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              {formatDuration(duration || recording.durationSeconds)} · {formatBytes(recording.fileSize)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.electronAPI?.openPath(recording.filePath)}
              title="Open in Windows Default Player"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-md text-zinc-200 text-xs font-medium border border-zinc-700/50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Windows Player
            </button>
            <button
              onClick={() => window.electronAPI?.openInExplorer(recording.filePath)}
              title="Show in File Explorer"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 backdrop-blur-md transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 backdrop-blur-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Viewport */}
        <div
          onClick={togglePlay}
          className="relative aspect-video w-full bg-black flex items-center justify-center cursor-pointer overflow-hidden"
        >
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Center Ripple Feedback on Click */}
          {showCenterRipple && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white animate-out zoom-out duration-300">
                {showCenterRipple === 'play' ? (
                  <Play className="w-7 h-7 fill-current ml-1" />
                ) : (
                  <Pause className="w-7 h-7 fill-current" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 z-30 px-5 pt-8 pb-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex flex-col gap-2.5 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Smooth Interactive Timeline Track */}
          <div
            ref={progressTrackRef}
            onMouseDown={handleScrubStart}
            className="relative h-2 w-full bg-zinc-800/80 hover:h-3 rounded-full cursor-pointer transition-all flex items-center group/track"
          >
            {/* Buffered Progress */}
            <div
              style={{ width: `${bufferedPercent}%` }}
              className="absolute left-0 top-0 bottom-0 bg-zinc-700/60 rounded-full transition-all"
            />

            {/* Played Progress */}
            <div
              style={{ width: `${currentPercent}%` }}
              className="absolute left-0 top-0 bottom-0 bg-indigo-500 rounded-full"
            />

            {/* Scrubber Thumb Knob */}
            <div
              style={{ left: `${currentPercent}%` }}
              className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md scale-0 group-hover/track:scale-100 transition-transform"
            />
          </div>

          {/* Controls Strip */}
          <div className="flex items-center justify-between text-zinc-300">
            {/* Left Controls: Play, Skip, Time, Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                className="p-1.5 rounded-lg text-white hover:bg-zinc-800/80 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => seekRelative(-5)}
                title="Rewind 5s (←)"
                className="p-1.5 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => seekRelative(5)}
                title="Forward 5s (→)"
                className="p-1.5 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 group/volume pl-1">
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Time Display */}
              <div className="text-xs font-mono text-zinc-400 pl-2">
                <span className="text-zinc-200 font-semibold">{formatDuration(currentTime)}</span>
                <span className="text-zinc-600 mx-1">/</span>
                <span>{formatDuration(duration || recording.durationSeconds)}</span>
              </div>
            </div>

            {/* Right Controls: Speed & Fullscreen */}
            <div className="flex items-center gap-2">
              <button
                onClick={cyclePlaybackRate}
                title="Change playback speed"
                className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white transition-colors border border-zinc-700/50"
              >
                {playbackRate}x
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                className="p-1.5 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
