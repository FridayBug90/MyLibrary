import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import DatabaseService from './DatabaseService';
import { GoogleAuthService } from './GoogleAuthService';
import { GoogleDriveService } from './GoogleDriveService';
import { Bluray, Book } from '../types';

const PREF_LAST_BACKUP = 'last_backup_date'; // stored as YYYY-MM-DD
const BACKUP_HOUR      = 4;                   // trigger after 04:00

class BackupServiceClass {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  async getLastBackupDate(): Promise<string | null> {
    const { value } = await Preferences.get({ key: PREF_LAST_BACKUP });
    return value;
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /** Returns true if DB is ready, user is signed in, time >= 04:00, and backup not done today. */
  async shouldRunBackup(): Promise<boolean> {
    if (!this.isAvailable())               return false;
    if (!(await GoogleAuthService.isSignedIn())) return false;
    if (new Date().getHours() < BACKUP_HOUR)     return false;
    const last = await this.getLastBackupDate();
    return last !== this.todayISO();
  }

  async exportToJSON(): Promise<string> {
    const [blurays, books] = await Promise.all([
      DatabaseService.getAllBlurays(),
      DatabaseService.getAllBooks(),
    ]);
    return JSON.stringify(
      { exported_at: new Date().toISOString(), blurays, books },
      null,
      2
    );
  }

  async performBackup(): Promise<void> {
    const json = await this.exportToJSON();
    await GoogleDriveService.uploadBackup(json);
    await Preferences.set({ key: PREF_LAST_BACKUP, value: this.todayISO() });
  }

  async importFromDrive(): Promise<void> {
    const json = await GoogleDriveService.downloadBackup();
    const data = JSON.parse(json) as { blurays?: Bluray[]; books?: Book[] };
    await DatabaseService.restoreFromBackup(data.blurays ?? [], data.books ?? []);
  }
}

export const BackupService = new BackupServiceClass();
