import { useState, useEffect, useCallback } from 'react';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { BackupService } from '../services/BackupService';

export interface BackupUIState {
  isAvailable: boolean;
  isSignedIn: boolean;
  userEmail: string | null;
  lastBackupDate: string | null;
  isBackingUp: boolean;
  isRestoring: boolean;
  backupError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  backupNow: () => Promise<void>;
  restoreNow: () => Promise<void>;
}

export function useBackupUI(): BackupUIState {
  const isAvailable = BackupService.isAvailable();

  const [isSignedIn,     setIsSignedIn]     = useState(false);
  const [userEmail,      setUserEmail]      = useState<string | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isBackingUp,    setIsBackingUp]    = useState(false);
  const [isRestoring,    setIsRestoring]    = useState(false);
  const [backupError,    setBackupError]    = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [signedIn, email, date] = await Promise.all([
      GoogleAuthService.isSignedIn(),
      GoogleAuthService.getUserEmail(),
      BackupService.getLastBackupDate(),
    ]);
    setIsSignedIn(signedIn);
    setUserEmail(email);
    setLastBackupDate(date);
  }, []);

  useEffect(() => {
    if (isAvailable) refresh();
  }, [isAvailable, refresh]);

  const signIn = useCallback(async () => {
    setBackupError(null);
    const ok = await GoogleAuthService.signIn();
    if (!ok) setBackupError('Accesso non riuscito. Riprova.');
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await GoogleAuthService.signOut();
    await refresh();
  }, [refresh]);

  const backupNow = useCallback(async () => {
    setIsBackingUp(true);
    setBackupError(null);
    try {
      await BackupService.performBackup();
      await refresh();
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Errore durante il backup.');
    } finally {
      setIsBackingUp(false);
    }
  }, [refresh]);

  const restoreNow = useCallback(async () => {
    setIsRestoring(true);
    setBackupError(null);
    try {
      await BackupService.importFromDrive();
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Errore durante il ripristino.');
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return {
    isAvailable,
    isSignedIn,
    userEmail,
    lastBackupDate,
    isBackingUp,
    isRestoring,
    backupError,
    signIn,
    signOut,
    backupNow,
    restoreNow,
  };
}
