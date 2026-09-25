import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from '@/components/layout/TitleBar';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { Studio } from '@/components/recording/Studio';
import { LibraryView } from '@/components/library/LibraryView';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { VideoPlayerModal } from '@/components/player/VideoPlayerModal';
import { AppSettings, RecordingItem } from '@/types/electron';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('studio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [playingRecording, setPlayingRecording] = useState<RecordingItem | null>(null);

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
        theme: 'dark',
        autoMinimizeOnRecord: false,
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-[#fafafa] font-sans antialiased">
      {/* Frameless Windows Titlebar */}
      <TitleBar />

      {/* Main App Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible shadcn-admin Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          settings={settings}
          recordingCount={recordings.length}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 overflow-hidden bg-[#0c0c0e]">
          {currentTab === 'studio' && (
            <Studio
              settings={settings}
              onRecordingSaved={loadData}
              onOpenSettings={() => setCurrentTab('settings')}
            />
          )}

          {currentTab === 'library' && (
            <LibraryView
              recordings={recordings}
              onPlayRecording={(rec) => setPlayingRecording(rec)}
              onDeleteRecording={handleDeleteRecording}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsModal
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
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
