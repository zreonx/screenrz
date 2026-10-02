import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export type CameraPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type CameraShape = 'circle' | 'rectangle';
export type VideoFormat = 'mp4' | 'webm';

export interface AppSettings {
  outputDirectory: string;
  fps: number;
  videoQuality: 'auto' | 'high' | 'ultra';
  videoFormat: VideoFormat;
  includeMic: boolean;
  includeAudio: boolean;
  includeCamera: boolean;
  cameraPosition: CameraPosition;
  cameraShape: CameraShape;
  cameraDeviceId?: string;
  theme: 'dark' | 'light';
  autoMinimizeOnRecord: boolean;
  minimizeToTray: boolean;
}

export interface RecordingRecord {
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
  hasCamera?: boolean;
  thumbnailUrl?: string;
  createdAt: string;
}

export class LocalDatabase {
  private dbPath: string;
  private db: any = null;
  private useJsonFallback: boolean = false;
  private jsonPath: string;

  constructor() {
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    this.dbPath = path.join(userDataPath, 'screenrz.db');
    this.jsonPath = path.join(userDataPath, 'screenrz_data.json');

    this.initialize();
  }

  public getDbPath(): string {
    return this.dbPath;
  }

  private initialize() {
    try {
      // Attempt Node.js 22 built-in SQLite
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(this.dbPath);
      console.log('[SQLite] Connected to local database:', this.dbPath);

      // Create Settings Table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create Recordings Table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS recordings (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL DEFAULT 0,
          duration_seconds REAL NOT NULL DEFAULT 0,
          width INTEGER NOT NULL DEFAULT 1920,
          height INTEGER NOT NULL DEFAULT 1080,
          fps INTEGER NOT NULL DEFAULT 60,
          mime_type TEXT NOT NULL DEFAULT 'video/webm',
          has_audio INTEGER NOT NULL DEFAULT 1,
          has_mic INTEGER NOT NULL DEFAULT 0,
          thumbnail_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      this.seedDefaultSettings();
    } catch (err: any) {
      console.warn('[SQLite] Native DatabaseSync not available, activating local structured store fallback:', err.message);
      this.useJsonFallback = true;
      if (!fs.existsSync(this.jsonPath)) {
        fs.writeFileSync(this.jsonPath, JSON.stringify({ settings: {}, recordings: [] }, null, 2));
      }
    }
  }

  private seedDefaultSettings() {
    const defaultDir = app ? path.join(app.getPath('videos'), 'Screenrz') : path.join(process.cwd(), 'recordings');
    if (!fs.existsSync(defaultDir)) {
      try {
        fs.mkdirSync(defaultDir, { recursive: true });
      } catch {}
    }

    const currentSettings = this.getSettings();
    if (!currentSettings.outputDirectory) {
      this.saveSetting('outputDirectory', defaultDir);
      this.saveSetting('fps', '60');
      this.saveSetting('videoQuality', 'high');
      this.saveSetting('videoFormat', 'mp4');
      this.saveSetting('includeMic', '0');
      this.saveSetting('includeAudio', '1');
      this.saveSetting('includeCamera', '0');
      this.saveSetting('cameraPosition', 'bottom-right');
      this.saveSetting('cameraShape', 'circle');
      this.saveSetting('cameraDeviceId', '');
      this.saveSetting('theme', 'dark');
      this.saveSetting('autoMinimizeOnRecord', '0');
      this.saveSetting('minimizeToTray', '1');
    }
  }

  public getSettings(): AppSettings {
    const defaultDir = app ? path.join(app.getPath('videos'), 'Screenrz') : path.join(process.cwd(), 'recordings');
    const defaults: AppSettings = {
      outputDirectory: defaultDir,
      fps: 60,
      videoQuality: 'high',
      videoFormat: 'mp4',
      includeMic: false,
      includeAudio: true,
      includeCamera: false,
      cameraPosition: 'bottom-right',
      cameraShape: 'circle',
      cameraDeviceId: '',
      theme: 'dark',
      autoMinimizeOnRecord: false,
      minimizeToTray: true,
    };

    if (this.useJsonFallback) {
      try {
        const raw = fs.readFileSync(this.jsonPath, 'utf8');
        const data = JSON.parse(raw);
        return { ...defaults, ...(data.settings || {}) };
      } catch {
        return defaults;
      }
    }

    try {
      const stmt = this.db.prepare('SELECT key, value FROM settings');
      const rows = stmt.all() as { key: string; value: string }[];
      const map: Record<string, string> = {};
      for (const row of rows) {
        map[row.key] = row.value;
      }

      return {
        outputDirectory: map.outputDirectory || defaults.outputDirectory,
        fps: map.fps ? parseInt(map.fps, 10) : defaults.fps,
        videoQuality: (map.videoQuality as any) || defaults.videoQuality,
        videoFormat: (map.videoFormat as any) || defaults.videoFormat,
        includeMic: map.includeMic === '1',
        includeAudio: map.includeAudio === '1',
        includeCamera: map.includeCamera === '1',
        cameraPosition: (map.cameraPosition as CameraPosition) || defaults.cameraPosition,
        cameraShape: (map.cameraShape as CameraShape) || defaults.cameraShape,
        cameraDeviceId: map.cameraDeviceId || '',
        theme: (map.theme as any) || defaults.theme,
        autoMinimizeOnRecord: map.autoMinimizeOnRecord === '1',
        minimizeToTray: map.minimizeToTray !== undefined ? map.minimizeToTray === '1' : true,
      };
    } catch (e) {
      console.error('[SQLite] Error reading settings:', e);
      return defaults;
    }
  }

  public saveSetting(key: string, value: string): void {
    if (this.useJsonFallback) {
      try {
        const raw = fs.readFileSync(this.jsonPath, 'utf8');
        const data = JSON.parse(raw);
        data.settings = data.settings || {};
        data.settings[key] = value;
        fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('Fallback save error:', e);
      }
      return;
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(key, value);
    } catch (e) {
      console.error('[SQLite] Error saving setting:', e);
    }
  }

  public saveAllSettings(settings: Partial<AppSettings>): boolean {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        const valStr = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
        this.saveSetting(key, valStr);
      }
    }
    return true;
  }

  public getRecordings(): RecordingRecord[] {
    if (this.useJsonFallback) {
      try {
        const raw = fs.readFileSync(this.jsonPath, 'utf8');
        const data = JSON.parse(raw);
        return data.recordings || [];
      } catch {
        return [];
      }
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM recordings ORDER BY created_at DESC');
      const rows = stmt.all() as any[];
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        fileName: r.file_name,
        filePath: r.file_path,
        fileSize: r.file_size,
        durationSeconds: r.duration_seconds,
        width: r.width,
        height: r.height,
        fps: r.fps,
        mimeType: r.mime_type,
        hasAudio: r.has_audio === 1,
        hasMic: r.has_mic === 1,
        thumbnailUrl: r.thumbnail_url,
        createdAt: r.created_at,
      }));
    } catch (e) {
      console.error('[SQLite] Error querying recordings:', e);
      return [];
    }
  }

  public saveRecording(rec: RecordingRecord): boolean {
    if (this.useJsonFallback) {
      try {
        const raw = fs.readFileSync(this.jsonPath, 'utf8');
        const data = JSON.parse(raw);
        data.recordings = data.recordings || [];
        const idx = data.recordings.findIndex((r: any) => r.id === rec.id);
        if (idx >= 0) {
          data.recordings[idx] = rec;
        } else {
          data.recordings.unshift(rec);
        }
        fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2));
        return true;
      } catch (e) {
        console.error('Fallback save recording error:', e);
        return false;
      }
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO recordings (
          id, title, file_name, file_path, file_size, duration_seconds,
          width, height, fps, mime_type, has_audio, has_mic, thumbnail_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          file_size = excluded.file_size,
          duration_seconds = excluded.duration_seconds,
          thumbnail_url = excluded.thumbnail_url
      `);

      stmt.run(
        rec.id,
        rec.title,
        rec.fileName,
        rec.filePath,
        rec.fileSize,
        rec.durationSeconds,
        rec.width,
        rec.height,
        rec.fps,
        rec.mimeType,
        rec.hasAudio ? 1 : 0,
        rec.hasMic ? 1 : 0,
        rec.thumbnailUrl || null,
        rec.createdAt || new Date().toISOString()
      );
      return true;
    } catch (e) {
      console.error('[SQLite] Error inserting recording:', e);
      return false;
    }
  }

  public deleteRecording(id: string): boolean {
    if (this.useJsonFallback) {
      try {
        const raw = fs.readFileSync(this.jsonPath, 'utf8');
        const data = JSON.parse(raw);
        data.recordings = (data.recordings || []).filter((r: any) => r.id !== id);
        fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2));
        return true;
      } catch {
        return false;
      }
    }

    try {
      const stmt = this.db.prepare('DELETE FROM recordings WHERE id = ?');
      stmt.run(id);
      return true;
    } catch (e) {
      console.error('[SQLite] Error deleting recording:', e);
      return false;
    }
  }
}
