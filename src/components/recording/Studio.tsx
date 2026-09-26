import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Monitor,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Pause,
  Layers,
  Sparkles,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import { AppSettings, DesktopCapturerSource, RecordingItem } from '@/types/electron';
import { formatDuration } from '@/lib/utils';
import { SourcePickerModal } from './SourcePickerModal';

export interface StudioControls {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  start: () => void;
}

interface StudioProps {
  settings: AppSettings | null;
  onRecordingSaved: () => void;
  onOpenSettings: () => void;
  onRecordingStateChange?: (state: 'idle' | 'recording' | 'paused', duration: number) => void;
  controlsRef?: React.MutableRefObject<StudioControls | null>;
  isActive?: boolean;
}

export const Studio: React.FC<StudioProps> = ({
  settings,
  onRecordingSaved,
  onOpenSettings,
  onRecordingStateChange,
  controlsRef,
  isActive = true,
}) => {
  const [selectedSource, setSelectedSource] = useState<DesktopCapturerSource | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [duration, setDuration] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);
  const [sysAudioEnabled, setSysAudioEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Sync initial settings
  useEffect(() => {
    if (settings) {
      setMicEnabled(settings.includeMic);
      setSysAudioEnabled(settings.includeAudio);
    }
  }, [settings]);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      stopPreviewStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // When tab becomes active again, ensure video preview is playing
  useEffect(() => {
    if (isActive && videoPreviewRef.current && mediaStreamRef.current) {
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [isActive]);

  const stopPreviewStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  // Start preview stream when source is selected
  const startPreviewForSource = useCallback(
    async (source: DesktopCapturerSource) => {
      stopPreviewStream();
      try {
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          audio: sysAudioEnabled
            ? {
                mandatory: {
                  chromeMediaSource: 'desktop',
                },
              }
            : false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id,
              minFrameRate: 30,
              maxFrameRate: settings?.fps || 60,
            },
          },
        });

        mediaStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to get media stream for source:', err);
      }
    },
    [sysAudioEnabled, settings?.fps]
  );

  const handleSelectSource = (source: DesktopCapturerSource) => {
    setSelectedSource(source);
    startPreviewForSource(source);
  };

  // Convert chunks, generate thumbnail, save file and write to SQLite
  const processAndSaveRecording = useCallback(
    async (mimeType: string, finalDuration: number) => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      if (blob.size === 0) return;

      const buffer = new Uint8Array(await blob.arrayBuffer());
      const timestamp = new Date();
      const formattedDate = timestamp
        .toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .split('.')[0];
      const fileName = `Screenrz_${formattedDate}.webm`;

      // Save directly to user's disk directory via Electron
      const saveResult = await window.electronAPI.saveRecordingFile(fileName, buffer);

      if (saveResult && saveResult.success) {
        // Capture thumbnail from video
        let thumbnailUrl: string | undefined = undefined;
        if (videoPreviewRef.current) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoPreviewRef.current, 0, 0, 320, 180);
              thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            }
          } catch {}
        }

        // Record in local SQLite database
        const item: RecordingItem = {
          id: `rec_${Date.now()}`,
          title: `Recording ${formattedDate}`,
          fileName,
          filePath: saveResult.filePath,
          fileSize: saveResult.size,
          durationSeconds: finalDuration,
          width: 1920,
          height: 1080,
          fps: settings?.fps || 60,
          mimeType,
          hasAudio: sysAudioEnabled,
          hasMic: micEnabled,
          thumbnailUrl,
          createdAt: timestamp.toISOString(),
        };

        await window.electronAPI.saveRecordingRecord(item);
        setLastSaved(saveResult.filePath);
        onRecordingSaved();

        // Clear notification after 4 seconds
        setTimeout(() => setLastSaved(null), 4000);
      }
    },
    [settings?.fps, sysAudioEnabled, micEnabled, onRecordingSaved]
  );

  // Start actual recording
  const handleStartRecording = useCallback(async () => {
    if (!selectedSource && !mediaStreamRef.current) {
      setIsPickerOpen(true);
      return;
    }

    try {
      let combinedStream = mediaStreamRef.current;

      // If mic is enabled, combine with mic audio
      if (micEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioTracks = [
            ...(combinedStream ? combinedStream.getAudioTracks() : []),
            ...micStream.getAudioTracks(),
          ];
          const videoTracks = combinedStream ? combinedStream.getVideoTracks() : [];
          combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
        } catch (e) {
          console.warn('Microphone access denied or unavailable:', e);
        }
      }

      if (!combinedStream) return;

      recordedChunksRef.current = [];

      // Determine optimal mimeType
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      let selectedMime = 'video/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond:
          settings?.videoQuality === 'ultra'
            ? 8000000
            : settings?.videoQuality === 'high'
            ? 5000000
            : 3000000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setDuration((currentDur) => {
          processAndSaveRecording(selectedMime, currentDur);
          return currentDur;
        });
      };

      recorder.start(1000); // 1-second chunks for stream stability
      mediaRecorderRef.current = recorder;

      setRecordingState('recording');
      setDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Auto minimize if configured
      if (settings?.autoMinimizeOnRecord) {
        window.electronAPI?.minimizeWindow();
      }
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }, [selectedSource, micEnabled, settings, processAndSaveRecording]);

  const handlePauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const handleResumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingState('idle');
  }, []);

  // Expose controls to parent component for global control pill
  useEffect(() => {
    if (controlsRef) {
      controlsRef.current = {
        pause: handlePauseRecording,
        resume: handleResumeRecording,
        stop: handleStopRecording,
        start: handleStartRecording,
      };
    }
  }, [controlsRef, handlePauseRecording, handleResumeRecording, handleStopRecording, handleStartRecording]);

  // Sync state changes to parent (for TitleBar and Global Status Pill)
  useEffect(() => {
    onRecordingStateChange?.(recordingState, duration);
  }, [recordingState, duration, onRecordingStateChange]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Top Banner & Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Screenrz Studio
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              Hardware Direct
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Zero-latency screen & window capture saving straight to local disk and SQLite.
          </p>
        </div>

        {/* Destination Path pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="max-w-[200px] truncate">
              {settings?.outputDirectory ? settings.outputDirectory.split('\\').pop() : 'Output folder'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="relative aspect-video w-full rounded-2xl bg-[#09090b] border border-zinc-800/90 overflow-hidden shadow-2xl flex items-center justify-center group">
        <video
          ref={videoPreviewRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-contain ${
            selectedSource ? 'block' : 'hidden'
          }`}
        />

        {!selectedSource && (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <Monitor className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">No Source Selected</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Choose a display monitor or specific app window to begin high-efficiency recording.
              </p>
            </div>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
            >
              <Layers className="w-4 h-4" />
              Choose Screen or Window
            </button>
          </div>
        )}

        {/* Overlay Badges */}
        {selectedSource && (
          <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-zinc-200 text-xs font-medium border border-white/10 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              {selectedSource.name}
            </span>
            <span className="px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-zinc-400 text-xs font-mono border border-white/10">
              {settings?.fps || 60} FPS
            </span>
          </div>
        )}

        {/* Change Source Button */}
        {selectedSource && recordingState === 'idle' && (
          <button
            onClick={() => setIsPickerOpen(true)}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-zinc-300 hover:text-white text-xs font-medium border border-white/10 transition-all shadow-md"
          >
            Change Source
          </button>
        )}

        {/* Recording active timer banner */}
        {recordingState !== 'idle' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-mono font-bold text-zinc-100">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              {recordingState}
            </span>
          </div>
        )}
      </div>

      {/* Control Strip & Audio Toggles */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
        {/* Left: Audio & Device Controls */}
        <div className="flex items-center gap-2">
          {/* System Audio Toggle */}
          <button
            onClick={() => setSysAudioEnabled(!sysAudioEnabled)}
            disabled={recordingState !== 'idle'}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              sysAudioEnabled
                ? 'bg-zinc-800/80 text-zinc-200 border-zinc-700'
                : 'bg-zinc-950/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {sysAudioEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span>System Audio</span>
          </button>

          {/* Microphone Toggle */}
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            disabled={recordingState !== 'idle'}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              micEnabled
                ? 'bg-zinc-800/80 text-zinc-200 border-zinc-700'
                : 'bg-zinc-950/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {micEnabled ? (
              <Mic className="w-4 h-4 text-emerald-400" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
            <span>Microphone</span>
          </button>
        </div>

        {/* Center: Primary Record Controls */}
        <div className="flex items-center gap-3">
          {recordingState === 'idle' ? (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              Start Recording
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {recordingState === 'recording' ? (
                <button
                  onClick={handlePauseRecording}
                  title="Pause recording"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResumeRecording}
                  title="Resume recording"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
              )}

              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-semibold shadow-md transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Finish & Save
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Spec Info */}
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Hardware VP8/WebM
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {lastSaved && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Saved to local disk and SQLite successfully!</span>
          </div>
          <button
            onClick={() => window.electronAPI.openInExplorer(lastSaved)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 font-medium text-[11px] transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
            Show in Explorer
          </button>
        </div>
      )}

      {/* Source Picker Modal */}
      <SourcePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectSource={handleSelectSource}
      />
    </div>
  );
};
