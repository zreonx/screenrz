export interface AppSettings {
  outputDirectory: string;
  fps: number;
  videoQuality: 'auto' | 'high' | 'ultra';
  includeMic: boolean;
  includeAudio: boolean;
  theme: 'dark' | 'light';
  autoMinimizeOnRecord: boolean;
  minimizeToTray: boolean;
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

export interface ElectronAPI {
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;

  // System & Dialogs
  selectDirectory: () => Promise<string | null>;
  openInExplorer: (filePath: string) => Promise<void>;
  openPath: (filePath: string) => Promise<void>;

  // Native Screen Capturer
  getSources: () => Promise<DesktopCapturerSource[]>;

  // File Writing (Direct Streaming / Buffer saving)
  saveRecordingFile: (
    fileName: string,
    buffer: Uint8Array
  ) => Promise<{ success: boolean; filePath: string; size: number }>;

  // Local SQLite Database
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<boolean>;
  getRecordings: () => Promise<RecordingItem[]>;
  saveRecordingRecord: (item: RecordingItem) => Promise<boolean>;
  deleteRecordingRecord: (id: string, deleteFile?: boolean) => Promise<boolean>;

  // Windows System Tray Status & Hotkeys
  updateTrayState: (isRecording: boolean, durationText?: string) => void;
  onHotkeyToggleRecord: (callback: () => void) => () => void;
  onHotkeyTogglePause: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
