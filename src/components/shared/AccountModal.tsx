import React, { useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonIcon, IonText, IonSpinner, IonAlert,
} from '@ionic/react';
import { cloudUploadOutline, cloudDownloadOutline, logOutOutline, personCircleOutline } from 'ionicons/icons';
import { BackupUIState } from '../../hooks/useBackupUI';

interface AccountModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  backup: BackupUIState;
  onRestoreComplete: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onDismiss, backup, onRestoreComplete }) => {
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleRestore = async () => {
    await backup.restoreNow();
    if (!backup.backupError) {
      onRestoreComplete();
      onDismiss();
    }
  };

  const busy = backup.isBackingUp || backup.isRestoring;

  return (
    <>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={onDismiss}
        breakpoints={[0, 0.6]}
        initialBreakpoint={0.6}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Account</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onDismiss}>Chiudi</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          {!backup.isSignedIn ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <IonIcon
                icon={personCircleOutline}
                style={{ fontSize: 64, color: 'var(--ion-color-medium)', marginBottom: 16 }}
              />
              <IonText color="medium">
                <p style={{ marginBottom: 24 }}>
                  Accedi con Google per abilitare il backup e il ripristino automatico su Drive.
                </p>
              </IonText>
              <IonButton expand="block" onClick={backup.signIn}>
                Accedi con Google
              </IonButton>
            </div>
          ) : (
            <div>
              {/* Profilo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <IonIcon icon={personCircleOutline} style={{ fontSize: 48, color: 'var(--ion-color-primary)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{backup.userEmail ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', marginTop: 2 }}>
                    Ultimo backup: {backup.lastBackupDate ?? 'Mai eseguito'}
                  </div>
                </div>
              </div>

              {/* Stato operazione */}
              {busy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <IonSpinner name="crescent" />
                  <IonText color="medium">
                    <span>{backup.isBackingUp ? 'Backup in corso…' : 'Ripristino in corso…'}</span>
                  </IonText>
                </div>
              )}
              {backup.backupError && (
                <IonText color="danger">
                  <p style={{ marginBottom: 12, fontSize: 13 }}>{backup.backupError}</p>
                </IonText>
              )}

              {/* Azioni */}
              <IonButton
                expand="block"
                onClick={backup.backupNow}
                disabled={busy}
                style={{ marginBottom: 8 }}
              >
                <IonIcon slot="start" icon={cloudUploadOutline} />
                Backup ora
              </IonButton>

              <IonButton
                expand="block"
                fill="outline"
                color="warning"
                onClick={() => setConfirmRestore(true)}
                disabled={busy}
                style={{ marginBottom: 24 }}
              >
                <IonIcon slot="start" icon={cloudDownloadOutline} />
                Ripristina da Drive
              </IonButton>

              <IonButton
                expand="block"
                fill="clear"
                color="medium"
                onClick={backup.signOut}
                disabled={busy}
              >
                <IonIcon slot="start" icon={logOutOutline} />
                Disconnetti account
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>

      <IonAlert
        isOpen={confirmRestore}
        header="Ripristina da Drive"
        message="Tutti i dati locali verranno sostituiti con il backup su Google Drive. Continuare?"
        buttons={[
          { text: 'Annulla', role: 'cancel', handler: () => setConfirmRestore(false) },
          {
            text: 'Ripristina',
            role: 'destructive',
            handler: () => { setConfirmRestore(false); handleRestore(); },
          },
        ]}
        onDidDismiss={() => setConfirmRestore(false)}
      />
    </>
  );
};

export default AccountModal;
