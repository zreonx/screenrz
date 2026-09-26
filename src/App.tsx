import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from '@/components/layout/TitleBar';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { Studio, StudioControls } from '@/components/recording/Studio';
import { LibraryView } from '@/components/library/LibraryView';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { VideoPlayerModal } from '@/components/player/VideoPlayerModal';
import { AppSettings, RecordingItem } from '@/types/electron';
import { formatDuration } from '@/lib/utils';
import { Pause, Play, Square, Video } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('studio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [playingRecording, setPlayingRecording] = useState<RecordingItem | null>(null);

  // Global recording status
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const studioControlsRef = useRef<StudioControls | null>(null);
  const recordingStateRef = useRef<'idle' | 'recording' | 'paused'>('idle');
  recordingStateRef.current = recordingState;

  // Load SQLite settings and recordings on launch
  const loadData = useCallback(async () => {
    if (window.electronAPI) {
      try {
        const loadedSettings = await window.electronAPI.getSettings();
        setSettings(loadedSettings);

        const loadedRecordings = await window.electronAPI.getRecordings();
        setRecordings(loadedRecordings);
      } catch (e) {
        console.error('Failed to load initial SQLite data:', e);
      }
    } else {
      // Browser preview mode fallback
      setSettings({
        outputDirectory: 'C:\\Users\\User\\Videos\\Screenrz',
        fps: 60,
        videoQuality: 'high',
        includeMic: false,
        includeAudio: true,
        includeCamera: false,
        cameraPosition: 'bottom-right',
        cameraShape: 'circle',
        cameraDeviceId: '',
        theme: 'dark',
        autoMinimizeOnRecord: false,
        minimizeToTray: true,
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for Bandicam-style Global Shortcuts (F12 / Shift+F12)
  useEffect(() => {
    if (!window.electronAPI?.onHotkeyToggleRecord) return;

    const unbindRecord = window.electronAPI.onHotkeyToggleRecord(() => {
      if (recordingStateRef.current === 'idle') {
        studioControlsRef.current?.start();
      } else {
        studioControlsRef.current?.stop();
      }
    });

    const unbindPause = window.electronAPI.onHotkeyTogglePause(() => {
      if (recordingStateRef.current === 'recording') {
        studioControlsRef.current?.pause();
      } else if (recordingStateRef.current === 'paused') {
        studioControlsRef.current?.resume();
      }
    });

    return () => {
      unbindRecord?.();
      unbindPause?.();
    };
  }, []);

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    if (window.electronAPI) {
      await window.electronAPI.saveSettings(newSettings);
      const updated = await window.electronAPI.getSettings();
      setSettings(updated);
    } else if (settings) {
      setSettings({ ...settings, ...newSettings });
    }
  };

  const handleDeleteRecording = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteRecordingRecord(id, true);
      const updated = await window.electronAPI.getRecordings();
      setRecordings(updated);
    } else {
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleRecordingStateChange = useCallback(
    (state: 'idle' | 'recording' | 'paused', duration: number) => {
      setRecordingState(state);
      setRecordingDuration(duration);
      if (window.electronAPI?.updateTrayState) {
        window.electronAPI.updateTrayState(state !== 'idle', formatDuration(duration));
      }
    },
    []
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-[#fafafa] font-sans antialiased">
      {/* Frameless Windows Titlebar */}
      <TitleBar isRecording={recordingState !== 'idle'} />

      {/* Main App Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Collapsible shadcn-admin Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          settings={settings}
          recordingCount={recordings.length}
          isRecording={recordingState !== 'idle'}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 overflow-hidden bg-[#0c0c0e] relative">
          {/* Floating Recording Mini-Control Pill when viewing Library or Settings while recording */}
          {recordingState !== 'idle' && currentTab !== 'studio' && (
            <div className="absolute top-4 right-6 z-40 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-rose-500/40 shadow-2xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-zinc-100">
                  {formatDuration(recordingDuration)}
                </span>
                <span className="text-[10px] uppercase font-semibold text-rose-400">
                  {recordingState}
                </span>
              </div>

              <div className="h-3.5 w-px bg-zinc-700" />

              <div className="flex items-center gap-1.5">
                {recordingState === 'recording' ? (
                  <button
                    onClick={() => studioControlsRef.current?.pause()}
                    className="p-1 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                    title="Pause (Shift+F12)"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => studioControlsRef.current?.resume()}
                    className="p-1 rounded-md hover:bg-zinc-800 text-indigo-400 hover:text-indigo-300 transition-colors"
                    title="Resume (Shift+F12)"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => studioControlsRef.current?.stop()}
                  className="p-1 rounded-md hover:bg-rose-950 text-rose-400 hover:text-rose-200 transition-colors"
                  title="Finish & Save (F12)"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>

                <button
                  onClick={() => setCurrentTab('studio')}
                  className="flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-[11px] font-medium text-indigo-400 border border-indigo-500/30 transition-colors"
                >
                  <Video className="w-3 h-3" />
                  Studio
                </button>
              </div>
            </div>
          )}

          {/* Studio View - Stays mounted and alive at all times to prevent recording interruption */}
          <div
            className={`h-full w-full ${
              currentTab === 'studio'
                ? 'block'
                : 'invisible absolute inset-0 pointer-events-none -z-50'
            }`}
          >
            <Studio
              settings={settings}
              onRecordingSaved={loadData}
              onOpenSettings={() => setCurrentTab('settings')}
              onRecordingStateChange={handleRecordingStateChange}
              controlsRef={studioControlsRef}
              isActive={currentTab === 'studio'}
            />
          </div>

          {/* Library View - Stays mounted to retain scroll and search state */}
          <div className={`h-full w-full ${currentTab === 'library' ? 'block' : 'hidden'}`}>
            <LibraryView
              recordings={recordings}
              onPlayRecording={(rec) => setPlayingRecording(rec)}
              onDeleteRecording={handleDeleteRecording}
            />
          </div>

          {/* Settings View - Stays mounted */}
          <div className={`h-full w-full ${currentTab === 'settings' ? 'block' : 'hidden'}`}>
            <SettingsModal
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        </main>
      </div>

      {/* Local Video Player Modal */}
      <VideoPlayerModal
        recording={playingRecording}
        onClose={() => setPlayingRecording(null)}
      />
    </div>
  );
}

export default App;
