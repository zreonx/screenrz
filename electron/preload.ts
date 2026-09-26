import { contextBridge, ipcRenderer } from 'electron';

export interface AppSettings {
  outputDirectory: string;
  fps: number;
  videoQuality: 'auto' | 'high' | 'ultra';
  includeMic: boolean;
  includeAudio: boolean;
  theme: 'dark' | 'light';
  autoMinimizeOnRecord: boolean;
}

export interface RecordingItem {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  mimeType: string;
  hasAudio: boolean;
  hasMic: boolean;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: string;
  display_id?: string;
  appIcon?: string;
}

const electronAPI = {
  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Native System & File Picker
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  openInExplorer: (filePath: string) => ipcRenderer.invoke('shell:open-in-explorer', filePath),
  openPath: (filePath: string) => ipcRenderer.invoke('shell:open-path', filePath),

  // Screen Capturer Sources
  getSources: () => ipcRenderer.invoke('capturer:get-sources'),

  // Direct File Writer
  saveRecordingFile: (fileName: string, buffer: Uint8Array) =>
    ipcRenderer.invoke('file:save-recording', { fileName, buffer }),

  // Local SQLite Database
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('db:save-settings', settings),
  getRecordings: () => ipcRenderer.invoke('db:get-recordings'),
  saveRecordingRecord: (item: RecordingItem) => ipcRenderer.invoke('db:save-recording', item),
  deleteRecordingRecord: (id: string, deleteFile = false) =>
    ipcRenderer.invoke('db:delete-recording', { id, deleteFile }),

  // Bandicam System-Wide Hotkey Listeners
  onHotkeyToggleRecord: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('hotkey:toggle-record', handler);
    return () => {
      ipcRenderer.removeListener('hotkey:toggle-record', handler);
    };
  },
  onHotkeyTogglePause: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('hotkey:toggle-pause', handler);
    return () => {
      ipcRenderer.removeListener('hotkey:toggle-pause', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
