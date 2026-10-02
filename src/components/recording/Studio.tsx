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
  Camera,
  CameraOff,
  Settings,
  Circle,
  Square as SquareIcon,
} from 'lucide-react';
import {
  AppSettings,
  DesktopCapturerSource,
  RecordingItem,
  CameraPosition,
  CameraShape,
} from '@/types/electron';
import { formatDuration } from '@/lib/utils';
import { SourcePickerModal } from './SourcePickerModal';
import { createWebGLCompositor, VideoCompositor } from '@/lib/videoCompositor';

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

  // Camera Overlay State
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('bottom-right');
  const [cameraShape, setCameraShape] = useState<CameraShape>('circle');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraConfigOpen, setIsCameraConfigOpen] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const canvasAnimRef = useRef<any>(null);
  const bgIntervalRef = useRef<any>(null);
  const compositorRef = useRef<VideoCompositor | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const durationRef = useRef<number>(0);

  // Keep durationRef synchronized
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Keep live compositor config synchronized with user UI changes
  useEffect(() => {
    if (compositorRef.current) {
      compositorRef.current.updateConfig(cameraPosition, cameraShape);
    }
  }, [cameraPosition, cameraShape]);

  // Sync initial settings
  useEffect(() => {
    if (settings) {
      setMicEnabled(settings.includeMic);
      setSysAudioEnabled(settings.includeAudio);
      if (settings.includeCamera !== undefined) setCameraEnabled(settings.includeCamera);
      if (settings.cameraPosition) setCameraPosition(settings.cameraPosition);
      if (settings.cameraShape) setCameraShape(settings.cameraShape);
      if (settings.cameraDeviceId) setSelectedCameraId(settings.cameraDeviceId);
    }
  }, [settings]);

  const refreshCameraDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(cams);
      if (cams.length > 0 && !selectedCameraId) {
        setSelectedCameraId(cams[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate cameras:', e);
    }
  }, [selectedCameraId]);

  // Enumerate cameras on mount
  useEffect(() => {
    refreshCameraDevices();
  }, [refreshCameraDevices]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPreviewStream();
      stopCameraStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (canvasAnimRef.current) {
        cancelAnimationFrame(canvasAnimRef.current);
        canvasAnimRef.current = null;
      }
      if (bgIntervalRef.current) {
        clearInterval(bgIntervalRef.current);
        bgIntervalRef.current = null;
      }
      if (compositorRef.current) {
        compositorRef.current.destroy();
        compositorRef.current = null;
      }
    };
  }, []);

  // When tab becomes active again, ensure video previews are playing
  useEffect(() => {
    if (isActive) {
      if (videoPreviewRef.current && mediaStreamRef.current) {
        videoPreviewRef.current.play().catch(() => {});
      }
      if (cameraVideoRef.current && cameraStreamRef.current) {
        cameraVideoRef.current.play().catch(() => {});
      }
    }
  }, [isActive]);

  // Callback ref to guarantee immediate srcObject attachment on mount
  const setCameraVideoNode = useCallback((node: HTMLVideoElement | null) => {
    cameraVideoRef.current = node;
    if (node && cameraStreamRef.current) {
      node.srcObject = cameraStreamRef.current;
      node.play().catch((err) => console.warn('Camera video play error:', err));
    }
  }, []);

  // Guarantee stream attachment whenever cameraEnabled toggles
  useEffect(() => {
    if (cameraEnabled && cameraStreamRef.current && cameraVideoRef.current) {
      if (cameraVideoRef.current.srcObject !== cameraStreamRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        cameraVideoRef.current.play().catch(() => {});
      }
    }
  }, [cameraEnabled]);

  const stopPreviewStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const startCameraStream = async (deviceId?: string) => {
    stopCameraStream();
    try {
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 60, min: 30 },
              }
            : {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 60, min: 30 },
              },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (exactErr) {
        console.warn('Specific camera constraint failed, using general video:', exactErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      cameraStreamRef.current = stream;
      setCameraEnabled(true);

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play().catch(() => {});
      }

      refreshCameraDevices();
    } catch (err: any) {
      console.warn('Failed to start webcam:', err);
      setCameraEnabled(false);
    }
  };

  const toggleCamera = () => {
    if (cameraEnabled) {
      stopCameraStream();
      setCameraEnabled(false);
    } else {
      startCameraStream(selectedCameraId);
    }
  };

  const cycleCameraPosition = () => {
    const positions: CameraPosition[] = [
      'bottom-right',
      'bottom-left',
      'top-left',
      'top-right',
    ];
    const nextIdx = (positions.indexOf(cameraPosition) + 1) % positions.length;
    setCameraPosition(positions[nextIdx]);
  };

  // Start preview stream when source is selected
  const startPreviewForSource = useCallback(
    async (source: DesktopCapturerSource): Promise<MediaStream | null> => {
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
        return stream;
      } catch (err) {
        console.error('Failed to get media stream for source:', err);
        return null;
      }
    },
    [sysAudioEnabled, settings?.fps]
  );

  const handleSelectSource = (source: DesktopCapturerSource) => {
    setSelectedSource(source);
    startPreviewForSource(source);
  };

  // Auto-detect and initialize primary display on load (Bandicam default)
  useEffect(() => {
    if (window.electronAPI?.getSources && !selectedSource) {
      window.electronAPI.getSources().then((sources) => {
        const primary = sources.find((s) => s.id.startsWith('screen:')) || sources[0];
        if (primary && !selectedSource) {
          setSelectedSource(primary);
          startPreviewForSource(primary);
        }
      }).catch(() => {});
    }
  }, [startPreviewForSource, selectedSource]);

  // Convert chunks, generate thumbnail, save file and write to SQLite
  const processAndSaveRecording = useCallback(
    async (mimeType: string, finalDuration: number) => {
      // Re-entrancy guard to prevent multiple files being written from double events
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      const chunks = [...recordedChunksRef.current];
      recordedChunksRef.current = [];

      if (chunks.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        isProcessingRef.current = false;
        return;
      }

      try {
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
            hasCamera: cameraEnabled,
            thumbnailUrl,
            createdAt: timestamp.toISOString(),
          };

          await window.electronAPI.saveRecordingRecord(item);
          setLastSaved(saveResult.filePath);
          onRecordingSaved();

          // Clear notification after 4 seconds
          setTimeout(() => setLastSaved(null), 4000);
        }
      } catch (err) {
        console.error('Error saving recording file:', err);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [settings?.fps, sysAudioEnabled, micEnabled, cameraEnabled, onRecordingSaved]
  );

  // Start actual recording
  const handleStartRecording = useCallback(async () => {
    isProcessingRef.current = false;
    isRecordingRef.current = true;
    durationRef.current = 0;

    let activeStream = mediaStreamRef.current;

    // Auto-discover primary display if not ready
    if (!activeStream) {
      if (window.electronAPI?.getSources) {
        const sources = await window.electronAPI.getSources();
        const primary = sources.find((s) => s.id.startsWith('screen:')) || sources[0];
        if (primary) {
          setSelectedSource(primary);
          activeStream = await startPreviewForSource(primary);
        }
      }
    }

    if (!activeStream) {
      setIsPickerOpen(true);
      return;
    }

    try {
      let combinedStream = activeStream;

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

      // IF CAMERA OVERLAY IS ENABLED: Composite camera onto screen using hardware WebGL shaders
      if (
        cameraEnabled &&
        cameraVideoRef.current &&
        videoPreviewRef.current &&
        cameraStreamRef.current
      ) {
        const screenVid = videoPreviewRef.current;
        const camVid = cameraVideoRef.current;

        // Clean up previous compositor instance if any
        if (compositorRef.current) {
          compositorRef.current.destroy();
          compositorRef.current = null;
        }
        if (bgIntervalRef.current) {
          clearInterval(bgIntervalRef.current);
          bgIntervalRef.current = null;
        }

        // Standard HD dimensions (capped at 1920 to eliminate 4K / QHD compositor lag)
        let targetWidth = screenVid.videoWidth || 1920;
        let targetHeight = screenVid.videoHeight || 1080;
        if (targetWidth > 1920) {
          const scale = 1920 / targetWidth;
          targetWidth = 1920;
          targetHeight = Math.round(targetHeight * scale);
        }
        if (targetWidth % 2 !== 0) targetWidth--;
        if (targetHeight % 2 !== 0) targetHeight--;

        const compositor = createWebGLCompositor(
          screenVid,
          camVid,
          targetWidth,
          targetHeight,
          cameraPosition,
          cameraShape
        );

        if (compositor) {
          compositorRef.current = compositor;
          const targetFps = settings?.fps || 60;
          const frameDuration = 1000 / targetFps;

          let lastFrameTime = performance.now();

          // Render loop driven by requestAnimationFrame (instant GPU draw in microseconds)
          const renderLoop = () => {
            if (!isRecordingRef.current) return;
            compositor.render();
            lastFrameTime = performance.now();
            canvasAnimRef.current = requestAnimationFrame(renderLoop);
          };

          // Background safety interval: guarantees 60 FPS even if minimized to Windows Tray
          const bgFallbackInterval = setInterval(() => {
            if (!isRecordingRef.current) return;
            const now = performance.now();
            if (now - lastFrameTime >= 25) {
              compositor.render();
              lastFrameTime = now;
            }
          }, frameDuration);

          canvasAnimRef.current = requestAnimationFrame(renderLoop);
          bgIntervalRef.current = bgFallbackInterval;

          const canvasStream = compositor.canvas.captureStream(targetFps);
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...combinedStream.getAudioTracks(),
          ]);
        }
      }

      recordedChunksRef.current = [];

      // Determine optimal mimeType (VP8 is hardware/CPU light, avoiding VP9 software encoding lag)
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
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
        isRecordingRef.current = false;
        if (canvasAnimRef.current) {
          cancelAnimationFrame(canvasAnimRef.current);
          canvasAnimRef.current = null;
        }
        if (bgIntervalRef.current) {
          clearInterval(bgIntervalRef.current);
          bgIntervalRef.current = null;
        }
        if (compositorRef.current) {
          compositorRef.current.destroy();
          compositorRef.current = null;
        }
        const finalDur = durationRef.current;
        await processAndSaveRecording(selectedMime, finalDur);
      };

      recorder.start(1000); // 1-second chunks for stream stability
      mediaRecorderRef.current = recorder;

      setRecordingState('recording');
      setDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Auto minimize if configured (Bandicam mode)
      if (settings?.autoMinimizeOnRecord) {
        window.electronAPI?.minimizeWindow();
      }
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }, [
    micEnabled,
    cameraEnabled,
    cameraPosition,
    cameraShape,
    settings,
    processAndSaveRecording,
    startPreviewForSource,
  ]);

  const handlePauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      isRecordingRef.current = false;
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const handleResumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      isRecordingRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      if (compositorRef.current && !canvasAnimRef.current) {
        const renderLoop = () => {
          if (!isRecordingRef.current) return;
          compositorRef.current?.render();
          canvasAnimRef.current = requestAnimationFrame(renderLoop);
        };
        canvasAnimRef.current = requestAnimationFrame(renderLoop);
      }
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (canvasAnimRef.current) {
      cancelAnimationFrame(canvasAnimRef.current);
      canvasAnimRef.current = null;
    }
    if (bgIntervalRef.current) {
      clearInterval(bgIntervalRef.current);
      bgIntervalRef.current = null;
    }
    if (compositorRef.current) {
      compositorRef.current.destroy();
      compositorRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingState('idle');
  }, []);

  // Expose controls to parent component for global control pill & F12 hotkey
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
    <div className="flex flex-col h-full overflow-y-auto p-3 sm:p-5 gap-3 sm:gap-4 settings-scroll">
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Screenrz Studio
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              Hardware Direct
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 hidden sm:block">
            Zero-latency screen &amp; webcam capture saving straight to local disk and SQLite.
          </p>
        </div>

        {/* Hotkey hint + Destination Path */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
            <span className="text-zinc-500">Record:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700 text-[10px]">
              F12
            </kbd>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="max-w-[120px] sm:max-w-[180px] truncate">
              {settings?.outputDirectory ? settings.outputDirectory.split('\\').pop() : 'Output folder'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport - Flexibly fits available height so controls are never pushed off */}
      <div className="relative flex-1 min-h-[160px] w-full rounded-xl sm:rounded-2xl bg-[#09090b] border border-zinc-800/90 overflow-hidden shadow-2xl flex items-center justify-center group select-none">
        {/* Base Screen Video */}
        <video
          ref={videoPreviewRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-contain ${selectedSource ? 'block' : 'hidden'}`}
        />

        {/* Live Webcam Picture-in-Picture Overlay */}
        {cameraEnabled && (
          <div
            onClick={cycleCameraPosition}
            title="Click to cycle webcam position (Bottom-Right, Bottom-Left, Top-Left, Top-Right)"
            className={`absolute z-20 cursor-pointer shadow-2xl transition-all duration-300 border-2 border-indigo-500 bg-zinc-950 overflow-hidden group/cam ${
              cameraPosition === 'bottom-right'
                ? 'bottom-2 right-2 sm:bottom-4 sm:right-4'
                : cameraPosition === 'bottom-left'
                ? 'bottom-2 left-2 sm:bottom-4 sm:left-4'
                : cameraPosition === 'top-right'
                ? 'top-2 right-2 sm:top-4 sm:right-4'
                : 'top-2 left-2 sm:top-4 sm:left-4'
            } ${
              cameraShape === 'circle'
                ? 'w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full'
                : 'w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-28 rounded-lg sm:rounded-xl'
            }`}
          >
            <video
              ref={setCameraVideoNode}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform -scale-x-100 bg-black"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cam:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-semibold text-white">
              Click to Move
            </div>
          </div>
        )}

        {!selectedSource && (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <Monitor className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Initializing Display Capture</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Detecting local display monitors and windows...
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
            {cameraEnabled && (
              <span className="px-2 py-1 rounded-md bg-indigo-950/70 backdrop-blur-md text-indigo-300 text-xs font-medium border border-indigo-500/30 flex items-center gap-1">
                <Camera className="w-3 h-3 text-indigo-400" />
                PiP Overlay
              </span>
            )}
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

      {/* Control Strip — responsive: flex-shrink-0 so it NEVER gets cut off or hidden */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex-shrink-0">

        {/* Left: Audio & Device Toggles */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* System Audio Toggle */}
          <button
            onClick={() => setSysAudioEnabled(!sysAudioEnabled)}
            disabled={recordingState !== 'idle'}
            title={sysAudioEnabled ? 'Disable System Audio' : 'Enable System Audio'}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
              sysAudioEnabled
                ? 'bg-zinc-800/80 text-zinc-200 border-zinc-700'
                : 'bg-zinc-950/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {sysAudioEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <VolumeX className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">System Audio</span>
          </button>

          {/* Microphone Toggle */}
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            disabled={recordingState !== 'idle'}
            title={micEnabled ? 'Disable Microphone' : 'Enable Microphone'}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
              micEnabled
                ? 'bg-zinc-800/80 text-zinc-200 border-zinc-700'
                : 'bg-zinc-950/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {micEnabled ? (
              <Mic className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <MicOff className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">Microphone</span>
          </button>

          {/* Camera Overlay Toggle & Config */}
          <div className="relative flex items-center">
            <button
              onClick={toggleCamera}
              disabled={recordingState !== 'idle'}
              title={cameraEnabled ? 'Disable Webcam PiP' : 'Enable Webcam PiP'}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-l-lg text-xs font-medium transition-colors border border-r-0 ${
                cameraEnabled
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/80'
                  : 'bg-zinc-950/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
              }`}
            >
              {cameraEnabled ? (
                <Camera className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              ) : (
                <CameraOff className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="hidden sm:inline whitespace-nowrap">Webcam PiP</span>
            </button>

            <button
              onClick={() => setIsCameraConfigOpen(!isCameraConfigOpen)}
              disabled={recordingState !== 'idle'}
              title="Camera Settings (Position & Shape)"
              className={`p-2 rounded-r-lg text-xs border transition-colors ${
                cameraEnabled
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/80 hover:bg-indigo-900/60'
                  : 'bg-zinc-950/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Camera Configuration Popover */}
            {isCameraConfigOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-72 p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 text-xs space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-semibold text-zinc-200">Webcam Overlay Setup</span>
                  <button
                    onClick={() => setIsCameraConfigOpen(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    ✕
                  </button>
                </div>

                {/* Device Selector */}
                <div>
                  <label className="text-[11px] text-zinc-400 mb-1 block">Camera Device</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (cameraEnabled) startCameraStream(e.target.value);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1.5 focus:outline-hidden"
                  >
                    {cameraDevices.length === 0 ? (
                      <option value="">Default Integrated Camera</option>
                    ) : (
                      cameraDevices.map((c, i) => (
                        <option key={c.deviceId || i} value={c.deviceId}>
                          {c.label || `Camera ${i + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Shape Selector */}
                <div>
                  <label className="text-[11px] text-zinc-400 mb-1 block">Overlay Shape</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCameraShape('circle')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded border ${
                        cameraShape === 'circle'
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <Circle className="w-3.5 h-3.5" />
                      Circle
                    </button>
                    <button
                      onClick={() => setCameraShape('rectangle')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded border ${
                        cameraShape === 'rectangle'
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <SquareIcon className="w-3.5 h-3.5" />
                      Rectangle
                    </button>
                  </div>
                </div>

                {/* Corner Position */}
                <div>
                  <label className="text-[11px] text-zinc-400 mb-1 block">Corner Position</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'top-left', label: 'Top Left' },
                        { id: 'top-right', label: 'Top Right' },
                        { id: 'bottom-left', label: 'Bottom Left' },
                        { id: 'bottom-right', label: 'Bottom Right' },
                      ] as const
                    ).map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => setCameraPosition(pos.id)}
                        className={`py-1 rounded text-[11px] border ${
                          cameraPosition === pos.id
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Primary Record Controls — always visible and responsive */}
        <div className="flex items-center gap-1.5 sm:gap-2 mx-auto sm:mx-0 flex-shrink-0">
          {recordingState === 'idle' ? (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 transition-all hover:scale-[1.03] active:scale-[0.98] whitespace-nowrap"
            >
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white animate-pulse flex-shrink-0" />
              <span>Start Recording</span>
              <span className="hidden sm:inline text-[10px] opacity-75 font-mono">(F12)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {recordingState === 'recording' ? (
                <button
                  onClick={handlePauseRecording}
                  title="Pause recording (Shift+F12)"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors whitespace-nowrap"
                >
                  <Pause className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Pause</span>
                </button>
              ) : (
                <button
                  onClick={handleResumeRecording}
                  title="Resume recording (Shift+F12)"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Resume</span>
                </button>
              )}

              <button
                onClick={handleStopRecording}
                title="Stop recording (F12)"
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-zinc-200 hover:bg-white text-zinc-950 text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
              >
                <Square className="w-3.5 h-3.5 fill-current flex-shrink-0" />
                <span>Finish &amp; Save</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Spec badge — hidden on small widths */}
        <div className="hidden md:flex items-center flex-shrink-0">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            {cameraEnabled ? 'Composited PiP' : 'Hardware Direct'}
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
