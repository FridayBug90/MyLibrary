import { useEffect } from 'react';
import { BackupService } from '../services/BackupService';

/**
 * Silently triggers a Google Drive backup when:
 *   - DB is ready
 *   - User is signed in with Google
 *   - Current time is past 04:00
 *   - Backup has not been done today
 */
export function useAutoBackupTrigger(dbReady: boolean): void {
  useEffect(() => {
    if (!dbReady) return;
    BackupService.shouldRunBackup().then(should => {
      if (should) {
        BackupService.performBackup().catch(err =>
          console.warn('[AutoBackup] failed:', err)
        );
      }
    });
  }, [dbReady]);
}
