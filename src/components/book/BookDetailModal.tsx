import React, { useEffect, useState } from 'react';
import {
  IonModal, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonBadge, IonIcon, IonSpinner,
} from '@ionic/react';
import { createOutline } from 'ionicons/icons';
import { Book } from '../../types';
import { LookupService } from '../../services/LookupService';

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onDismiss: () => void;
  onEdit: (book: Book) => void;
  onUpdate: (id: number, data: import('../../types').BookInput) => Promise<void>;
}

const BookDetailModal: React.FC<BookDetailModalProps> = ({ book, isOpen, onDismiss, onEdit, onUpdate }) => {
  const [fetching, setFetching] = useState(false);
  const [localCover, setLocalCover] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !book) return;
    setLocalCover(book.cover_img);
    if (book.cover_img) return;

    setFetching(true);
    LookupService.lookupBookByTitle(book.title)
      .then(result => {
        if (!result?.coverUrl) return;
        setLocalCover(result.coverUrl);
        onUpdate(book.id, {
          title: book.title, original_title: book.original_title,
          author: book.author, genre: book.genre, isbn: book.isbn,
          saga: book.saga, volume: book.volume, read: book.read,
          status: book.status, rating: book.rating, notes: book.notes,
          cover_img: result.coverUrl,
        });
      })
      .finally(() => setFetching(false));
  }, [isOpen, book]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!book) return null;

  const genres = book.genre?.split(',').map(g => g.trim()).filter(Boolean) ?? [];

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      breakpoints={[0, 0.92]}
      initialBreakpoint={0.92}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle style={{ fontSize: 16 }}>{book.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => { onDismiss(); onEdit(book); }}>
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
            <IonButton onClick={onDismiss}>Chiudi</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ width: '100%', background: '#111', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 12 }}>
          {fetching && (
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
              <IonSpinner name="crescent" color="light" />
            </div>
          )}
          {localCover
            ? <img src={localCover} alt={book.title} style={{ width: '75%', maxHeight: 280, objectFit: 'contain' }} />
            : !fetching && <span style={{ color: '#666', fontSize: 13 }}>Nessuna copertina</span>
          }
        </div>
        <div style={{ padding: '16px 20px' }}>
          {/* Titolo */}
          <h2 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
            {book.title}
          </h2>
          {book.original_title && book.original_title !== book.title && (
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ion-color-medium)', fontStyle: 'italic' }}>
              {book.original_title}
            </p>
          )}

          {/* Autore */}
          {book.author && (
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ion-color-medium)' }}>
              di <strong style={{ color: 'var(--ion-text-color)' }}>{book.author}</strong>
            </p>
          )}

          {/* Saga */}
          {(book.saga || book.volume !== null) && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ion-color-medium)', fontStyle: 'italic' }}>
              {[book.saga, book.volume !== null ? `Vol. ${book.volume}` : null].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Badge status + read */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <IonBadge color={book.status === 'owned' ? 'success' : 'warning'} style={{ fontSize: 12 }}>
              {book.status === 'owned' ? 'Posseduto' : 'Wishlist'}
            </IonBadge>
            {book.read && <IonBadge color="tertiary" style={{ fontSize: 12 }}>Letto</IonBadge>}
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
          {book.rating !== null && (
            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontSize: 15, fontWeight: 600,
                color: 'var(--ion-color-warning)',
                background: 'rgba(var(--ion-color-warning-rgb), 0.12)',
                padding: '4px 10px', borderRadius: 10,
              }}>
                ★ {book.rating}/10
              </span>
            </div>
          )}

          {/* ISBN */}
          {book.isbn && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ion-color-medium)' }}>
              ISBN: {book.isbn}
            </p>
          )}

          {/* Note */}
          {book.notes && (
            <div style={{
              marginTop: 8, padding: '10px 14px',
              background: 'var(--ion-color-light)', borderRadius: 10,
              fontSize: 14, lineHeight: 1.5,
            }}>
              {book.notes}
            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default BookDetailModal;
