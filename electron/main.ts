import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  desktopCapturer,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  protocol,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { LocalDatabase } from './database';

// Register privileged local media protocol for hardware-accelerated video streaming
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

// Bandicam-like performance optimization flags
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

let mainWindow: BrowserWindow | null = null;
let db: LocalDatabase;
let tray: Tray | null = null;
let isRecordingState = false;
let currentRecordingDuration = '';

// Embedded high-contrast 16x16 PNG tray icons (Normal & Recording)
const defaultTrayBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAMvj///8f/x8YGJgZGRk/4jGQkcHBwZGBgYFhERMT40e8BqC4gYGB4R8uA5AlmRgYGDKgYsgGUFxANoAZh4EcDRY8BrAQM4Dk8IH0eIDhAwkGAAAh2hcvs+JvGAAAAABJRU5ErkJggg==';
const recTrayBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZ0lEQVQ4T2NkYPj/n4GBgYGRgYFBn4GBgZGREYbhVDAwMPz/j48BqAwwMDP+Z2Rg+A/kY0eNBIPhA2AYoHgUEMtANgA5gGEA2QAgx2EgzQC8BhAyAORwAOkhsIDhAwnqGgAAkEUYL+M90dMAAAAASUVORK5CYII=';

const defaultTrayIcon = nativeImage.createFromDataURL('data:image/png;base64,' + defaultTrayBase64);
const recTrayIcon = nativeImage.createFromDataURL('data:image/png;base64,' + recTrayBase64);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Ensure only a single instance of Screenrz is running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  const settings = db.getSettings();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Screenrz',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: isRecordingState ? '⏹ Stop Recording (F12)' : '⏺ Start Recording (F12)',
      click: () => {
        mainWindow?.webContents.send('hotkey:toggle-record');
      },
    },
    {
      label: '⏸ Pause / Resume (Shift+F12)',
      enabled: isRecordingState,
      click: () => {
        mainWindow?.webContents.send('hotkey:toggle-pause');
      },
    },
    { type: 'separator' },
    {
      label: '📁 Open Recordings Folder',
      click: () => {
        if (fs.existsSync(settings.outputDirectory)) {
          shell.openPath(settings.outputDirectory);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Exit Screenrz',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray?.setContextMenu(contextMenu);
}

function createTray() {
  if (tray) return;

  tray = new Tray(defaultTrayIcon);
  tray.setToolTip('Screenrz - Ready');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  updateTrayMenu();
}

function createWindow() {
  db = new LocalDatabase();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: false, // Frameless for modern custom titlebar
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // Allows playing local video files directly
      backgroundThrottling: false, // Prevents background or minimized capture throttling
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle native minimize behavior (minimize to Windows System Tray status bar)
  mainWindow.on('minimize', (e: Electron.Event) => {
    const settings = db.getSettings();
    if (settings.minimizeToTray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  // Open external links in default system browser (GitHub, docs, etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5174';
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
}

// Window controls
ipcMain.on('window:minimize', () => {
  const settings = db.getSettings();
  if (settings.minimizeToTray) {
    mainWindow?.hide();
  } else {
    mainWindow?.minimize();
  }
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// System Tray Status Sync
ipcMain.on('tray:update-state', (_event, { isRecording, durationText }) => {
  isRecordingState = isRecording;
  currentRecordingDuration = durationText || '';

  if (tray) {
    if (isRecording) {
      tray.setImage(recTrayIcon);
      tray.setToolTip(`Screenrz - Recording (${currentRecordingDuration || 'Active'})`);
      mainWindow?.setProgressBar(1, { mode: 'error' }); // Windows taskbar red recording status
    } else {
      tray.setImage(defaultTrayIcon);
      tray.setToolTip('Screenrz - Ready');
      mainWindow?.setProgressBar(-1); // Clear taskbar status
    }
    updateTrayMenu();
  }
});

// System & Directory Dialogs
ipcMain.handle('dialog:select-directory', async () => {
  if (!mainWindow) return null;
  const currentSettings = db.getSettings();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Recordings Directory',
    defaultPath: currentSettings.outputDirectory,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];
  db.saveSetting('outputDirectory', selectedPath);
  updateTrayMenu();
  return selectedPath;
});

ipcMain.handle('shell:open-in-explorer', async (_event, filePath: string) => {
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    const settings = db.getSettings();
    if (fs.existsSync(settings.outputDirectory)) {
      shell.openPath(settings.outputDirectory);
    }
  }
});

ipcMain.handle('shell:open-path', async (_event, filePath: string) => {
  if (fs.existsSync(filePath)) {
    await shell.openPath(filePath);
  }
});

ipcMain.handle('shell:open-external', async (_event, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
  }
});

// Desktop Capturer Sources
ipcMain.handle('capturer:get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    display_id: s.display_id,
    appIcon: s.appIcon ? s.appIcon.toDataURL() : undefined,
  }));
});

// Direct File Saving
ipcMain.handle(
  'file:save-recording',
  async (_event, { fileName, buffer }: { fileName: string; buffer: Uint8Array }) => {
    try {
      const settings = db.getSettings();
      const outputDir = settings.outputDirectory;

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(buffer));

      const stats = fs.statSync(filePath);
      return { success: true, filePath, size: stats.size };
    } catch (err: any) {
      console.error('Failed to save recording file:', err);
      return { success: false, error: err.message };
    }
  }
);

// SQLite Database IPC Handlers
ipcMain.handle('db:get-settings', async () => {
  return db.getSettings();
});

ipcMain.handle('db:save-settings', async (_event, settings) => {
  const res = db.saveAllSettings(settings);
  updateTrayMenu();
  return res;
});

ipcMain.handle('db:get-recordings', async () => {
  return db.getRecordings();
});

ipcMain.handle('db:save-recording', async (_event, item) => {
  return db.saveRecording(item);
});

ipcMain.handle('db:delete-recording', async (_event, { id, deleteFile }) => {
  if (deleteFile) {
    const recordings = db.getRecordings();
    const target = recordings.find((r) => r.id === id);
    if (target && fs.existsSync(target.filePath)) {
      try {
        fs.unlinkSync(target.filePath);
      } catch (e) {
        console.warn('Could not delete file from disk:', e);
      }
    }
  }
  return db.deleteRecording(id);
});

// Application lifecycle & Global Bandicam Hotkeys
app.whenReady().then(() => {
  // Register high-performance local media streaming protocol with HTTP 206 Byte Range support
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url);
      let filePath = decodeURIComponent(url.pathname);
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.slice(1);
      }

      if (!fs.existsSync(filePath)) {
        return new Response('Media file not found', { status: 404 });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = request.headers.get('range');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const fileStream = fs.createReadStream(filePath, { start, end });
        const nodeStream = fileStream as any;

        const readableStream = new ReadableStream({
          start(controller) {
            nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (err: any) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        return new Response(readableStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': 'video/webm',
          },
        });
      }

      const fileStream = fs.createReadStream(filePath);
      const nodeStream = fileStream as any;
      const readableStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
          nodeStream.on('end', () => controller.close());
          nodeStream.on('error', (err: any) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new Response(readableStream, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/webm',
        },
      });
    } catch (e: any) {
      console.error('Error serving media stream:', e);
      return new Response(e.message, { status: 500 });
    }
  });

  createWindow();

  // Bandicam Global Shortcuts:
  // F12 -> Toggle Start / Stop Recording
  // Shift+F12 -> Toggle Pause / Resume Recording
  try {
    globalShortcut.register('F12', () => {
      mainWindow?.webContents.send('hotkey:toggle-record');
    });

    globalShortcut.register('Shift+F12', () => {
      mainWindow?.webContents.send('hotkey:toggle-pause');
    });

    console.log('[Hotkeys] Registered F12 (Record/Stop) and Shift+F12 (Pause/Resume)');
  } catch (err) {
    console.warn('[Hotkeys] Failed to register global shortcuts:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
