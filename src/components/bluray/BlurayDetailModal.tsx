import React, { useEffect, useState } from 'react';
import {
  IonModal, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonBadge, IonSpinner, IonIcon,
} from '@ionic/react';
import { createOutline } from 'ionicons/icons';
import { Bluray, BlurayInput } from '../../types';
import { LookupService } from '../../services/LookupService';

interface BlurayDetailModalProps {
  bluray: Bluray | null;
  isOpen: boolean;
  onDismiss: () => void;
  onEdit: (bluray: Bluray) => void;
  onUpdate: (id: number, data: BlurayInput) => Promise<void>;
}

const statusColor = (status: Bluray['status']) =>
  status === 'owned' ? 'success' : 'warning';

const BlurayDetailModal: React.FC<BlurayDetailModalProps> = ({
  bluray, isOpen, onDismiss, onEdit, onUpdate,
}) => {
  const [fetching, setFetching] = useState(false);
  const [localCover, setLocalCover] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bluray) return;
    setLocalCover(bluray.cover_img);

    // Skip TMDB call if cover already present
    if (bluray.cover_img) return;

    setFetching(true);
    LookupService.lookupBlurayByTitle(bluray.title)
      .then(result => {
        if (!result) return;
        const updated: BlurayInput = {
          title:          result.title ?? bluray.title,
          original_title: result.original_title ?? bluray.original_title,
          director:       result.director ?? bluray.director,
          genre:          result.genre ?? bluray.genre,
          saga:           bluray.saga,
          volume:         bluray.volume,
          steelbook:      bluray.steelbook,
          watched:        bluray.watched,
          animated:       bluray.animated,
          status:         bluray.status,
          rating:         bluray.rating,
          notes:          bluray.notes,
          barcode:        bluray.barcode,
          cover_img:      result.imageUrl,
        };
        setLocalCover(result.imageUrl);
        onUpdate(bluray.id, updated);
      })
      .finally(() => setFetching(false));
  }, [isOpen, bluray]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!bluray) return null;

  const genres = bluray.genre?.split(',').map(g => g.trim()).filter(Boolean) ?? [];

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      breakpoints={[0, 0.92]}
      initialBreakpoint={0.92}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle style={{ fontSize: 16 }}>{bluray.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => { onDismiss(); onEdit(bluray); }}>
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
            <IonButton onClick={onDismiss}>Chiudi</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Cover */}
        <div style={{ width: '100%', background: '#111', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 12 }}>
          {fetching && (
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
              <IonSpinner name="crescent" color="light" />
            </div>
          )}
          {localCover
            ? <img src={localCover} alt={bluray.title} style={{ width: '75%', maxHeight: 280, objectFit: 'contain' }} />
            : !fetching && <span style={{ color: '#666', fontSize: 13 }}>Nessuna copertina</span>
          }
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Titolo */}
          <h2 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
            {bluray.title}
          </h2>
          {bluray.original_title && bluray.original_title !== bluray.title && (
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ion-color-medium)', fontStyle: 'italic' }}>
              {bluray.original_title}
            </p>
          )}

          {/* Regista */}
          {bluray.director && (
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ion-color-medium)' }}>
              Regia di <strong style={{ color: 'var(--ion-text-color)' }}>{bluray.director}</strong>
            </p>
          )}

          {/* Saga */}
          {(bluray.saga || bluray.volume !== null) && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ion-color-medium)', fontStyle: 'italic' }}>
              {[bluray.saga, bluray.volume !== null ? `Parte ${bluray.volume}` : null].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Badge status + flags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <IonBadge color={statusColor(bluray.status)} style={{ fontSize: 12 }}>
              {bluray.status === 'owned' ? 'Posseduto' : 'Wishlist'}
            </IonBadge>
            {bluray.steelbook && <IonBadge color="tertiary" style={{ fontSize: 12 }}>Steelbook</IonBadge>}
            {bluray.animated && <IonBadge color="secondary" style={{ fontSize: 12 }}>Animazione</IonBadge>}
            {bluray.watched && <IonBadge color="primary" style={{ fontSize: 12 }}>Visto</IonBadge>}
          </div>

          {/* Generi */}
          {genres.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {genres.map(g => (
                <IonBadge key={g} color="medium" style={{ fontSize: 12 }}>{g}</IonBadge>
              ))}
            </div>
          )}

          {/* Voto */}
          {bluray.rating !== null && (
            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontSize: 15, fontWeight: 600,
                color: 'var(--ion-color-warning)',
                background: 'rgba(var(--ion-color-warning-rgb), 0.12)',
                padding: '4px 10px', borderRadius: 10,
              }}>
                ★ {bluray.rating}/10
              </span>
            </div>
          )}

          {/* Barcode */}
          {bluray.barcode && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ion-color-medium)' }}>
              Barcode: {bluray.barcode}
            </p>
          )}

          {/* Note */}
          {bluray.notes && (
            <div style={{
              marginTop: 8, padding: '10px 14px',
              background: 'var(--ion-color-light)', borderRadius: 10,
              fontSize: 14, lineHeight: 1.5,
            }}>
              {bluray.notes}
            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default BlurayDetailModal;
