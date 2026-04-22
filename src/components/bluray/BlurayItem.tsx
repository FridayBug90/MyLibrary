import React, { useRef, useState } from 'react';
import { IonBadge, IonIcon } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import { Bluray } from '../../types';

interface BlurayItemProps {
  bluray: Bluray;
  onEdit: (bluray: Bluray) => void;
  onDelete: (id: number) => void;
  onDetail: (bluray: Bluray) => void;
}

const statusColor = (status: Bluray['status']) =>
  status === 'owned' ? 'success' : 'warning';

const REVEAL = 130;
const THRESHOLD = 60;

const BlurayItem: React.FC<BlurayItemProps> = ({ bluray, onEdit, onDelete, onDetail }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [snapped, setSnapped] = useState(false);
  const touchStartX = useRef(0);
  const isTouching = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isTouching.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isTouching.current) return;
    const delta = touchStartX.current - e.touches[0].clientX;
    const base = snapped ? REVEAL : 0;
    setSwipeX(Math.max(0, Math.min(REVEAL, base + delta)));
  };

  const onTouchEnd = () => {
    isTouching.current = false;
    if (swipeX > THRESHOLD) {
      setSwipeX(REVEAL);
      setSnapped(true);
    } else {
      setSwipeX(0);
      setSnapped(false);
    }
  };

  const close = () => { setSwipeX(0); setSnapped(false); };

  return (
    <div style={{ padding: '4px 12px', position: 'relative', overflow: 'hidden', borderRadius: 12, transform: 'translateZ(0)' }}>
      {/* Pulsanti azione dietro la card */}
      {(snapped || swipeX > 0) && <div style={{
        position: 'absolute', right: 12, top: 4, bottom: 4,
        display: 'flex', width: REVEAL, borderRadius: '0 12px 12px 0', overflow: 'hidden',
      }}>
        <button
          onClick={() => { close(); onEdit(bluray); }}
          style={{
            flex: 1, border: 'none', cursor: 'pointer',
            background: 'var(--ion-color-primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IonIcon icon={createOutline} style={{ fontSize: 22 }} />
        </button>
        <button
          onClick={() => { close(); onDelete(bluray.id); }}
          style={{
            flex: 1, border: 'none', cursor: 'pointer',
            background: 'var(--ion-color-danger)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IonIcon icon={trashOutline} style={{ fontSize: 22 }} />
        </button>
      </div>}

      {/* Card traslabile */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={snapped ? close : () => onDetail(bluray)}
        style={{
          background: 'var(--ion-card-background)',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
          padding: '12px 16px',
          transform: `translateX(-${swipeX}px)`,
          transition: isTouching.current ? 'none' : 'transform 0.25s ease',
          willChange: 'transform',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bluray.title}
          </div>
          {bluray.rating !== null && (
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ion-color-warning)', whiteSpace: 'nowrap', background: 'rgba(var(--ion-color-warning-rgb), 0.12)', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>
              ★ {bluray.rating}/10
            </div>
          )}
        </div>

        {bluray.original_title && bluray.original_title !== bluray.title && (
          <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', marginTop: 2, fontStyle: 'italic' }}>
            {bluray.original_title}
          </div>
        )}
        {bluray.director && (
          <div style={{ fontSize: 13, color: 'var(--ion-color-medium)', marginTop: 4 }}>
            {bluray.director}
          </div>
        )}

        {(bluray.saga || bluray.volume !== null) && (
          <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', marginTop: 2, fontStyle: 'italic' }}>
            {[bluray.saga, bluray.volume !== null ? `Parte ${bluray.volume}` : null].filter(Boolean).join(' · ')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <IonBadge color={statusColor(bluray.status)} style={{ fontSize: 11 }}>
            {bluray.status === 'owned' ? 'Posseduto' : 'Wishlist'}
          </IonBadge>
          {bluray.steelbook && <IonBadge color="tertiary" style={{ fontSize: 11 }}>Steelbook</IonBadge>}
          {bluray.animated && <IonBadge color="secondary" style={{ fontSize: 11 }}>Animazione</IonBadge>}
          {bluray.watched && <IonBadge color="primary" style={{ fontSize: 11 }}>Visto</IonBadge>}
          {bluray.genre?.split(',').map(g => g.trim()).filter(Boolean).map(g => (
            <IonBadge key={g} color="medium" style={{ fontSize: 11 }}>{g}</IonBadge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlurayItem;
