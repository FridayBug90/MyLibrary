import React, { useEffect, useMemo, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonIcon,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonButton,
  IonChip,
  IonLabel,
  IonItem,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { add, funnelOutline } from 'ionicons/icons';
import { useLibrary } from '../context/LibraryContext';
import BookList from '../components/book/BookList';
import BookModal from '../components/book/BookModal';
import BookDetailModal from '../components/book/BookDetailModal';
import Autocomplete from '../components/shared/Autocomplete';
import { Book, BookInput } from '../types';

const PAGE_SIZE = 30;

type SortKey = 'title' | 'rating' | 'genre' | 'status' | 'author';
type TriFilter = null | true | false;
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title',  label: 'Titolo' },
  { key: 'author', label: 'Autore' },
  { key: 'genre',  label: 'Genere' },
  { key: 'rating', label: 'Voto' },
  { key: 'status', label: 'Stato' },
];

function sortBooks(list: Book[], key: SortKey): Book[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case 'title':  return a.title.localeCompare(b.title);
      case 'rating': return (b.rating ?? 0) - (a.rating ?? 0);
      case 'genre':  return (a.genre ?? '').localeCompare(b.genre ?? '');
      case 'status': return a.status.localeCompare(b.status);
      case 'author': return (a.author ?? '').localeCompare(b.author ?? '');
    }
  });
}

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
    color: 'var(--ion-color-medium)', margin: '20px 0 8px',
  }}>
    {text}
  </p>
);

const Tab2: React.FC = () => {
  const { books, loadBooks, addBook, updateBook, deleteBook } = useLibrary();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [detailBook, setDetailBook] = useState<Book | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('title');
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<TriFilter>(null);
  const [ownedFilter, setOwnedFilter] = useState<TriFilter>(null);
  const [authorFilter, setAuthorFilter] = useState('');
  const [sagaFilter, setSagaFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  useEffect(() => { loadBooks(); }, [loadBooks]);

  const allAuthors = useMemo(() => {
    const s = new Set<string>();
    books.forEach(b => b.author?.split(', ').forEach(a => { const t = a.trim(); if (t) s.add(t); }));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [books]);

  const allSagas = useMemo(() => {
    const s = new Set<string>();
    books.forEach(b => { if (b.saga) s.add(b.saga); });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [books]);

  const allGenres = useMemo(() => {
    const s = new Set<string>();
    books.forEach(b => b.genre?.split(', ').forEach(g => { const t = g.trim(); if (t) s.add(t); }));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [books]);

  const sorted = useMemo(() => {
    let list = books;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q)
      );
    }
    if (readFilter !== null)  list = list.filter(b => b.read === readFilter);
    if (ownedFilter !== null) list = list.filter(b => (b.status === 'owned') === ownedFilter);
    if (authorFilter) list = list.filter(b => b.author?.split(', ').map(a => a.trim()).includes(authorFilter));
    if (sagaFilter)   list = list.filter(b => b.saga === sagaFilter);
    if (genreFilter.length > 0) list = list.filter(b => genreFilter.every(g => b.genre?.split(', ').map(x => x.trim()).includes(g)));
    if (sagaFilter) return [...list].sort((a, b) => (a.volume ?? Infinity) - (b.volume ?? Infinity));
    return sortBooks(list, sortBy);
  }, [books, searchQuery, sortBy, readFilter, ownedFilter, authorFilter, sagaFilter, genreFilter]);

  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [sorted]);

  const visibleBooks = useMemo(() => sorted.slice(0, displayCount), [sorted, displayCount]);

  const activeFilterCount =
    (readFilter !== null ? 1 : 0) +
    (ownedFilter !== null ? 1 : 0) +
    (authorFilter ? 1 : 0) +
    (sagaFilter ? 1 : 0) +
    (genreFilter.length > 0 ? 1 : 0);

  const resetFilters = () => {
    setReadFilter(null); setOwnedFilter(null);
    setAuthorFilter(''); setSagaFilter(''); setGenreFilter([]);
  };

  const handleSave = async (data: BookInput) => {
    if (selectedBook) await updateBook(selectedBook.id, data);
    else await addBook(data);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId !== null) { await deleteBook(deleteId); setDeleteId(null); }
  };

  const hasValueFilters = allAuthors.length > 0 || allSagas.length > 0 || allGenres.length > 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Libri</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill={activeFilterCount > 0 ? 'solid' : 'clear'}
              color={activeFilterCount > 0 ? 'primary' : 'default'}
              onClick={() => setFilterOpen(true)}
            >
              <IonIcon slot="icon-only" icon={funnelOutline} />
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'var(--ion-color-danger)', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder="Cerca titolo o autore..."
            onIonInput={e => setSearchQuery(e.detail.value ?? '')}
            debounce={300}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await loadBooks(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <BookList
          books={visibleBooks}
          onEdit={b => { setSelectedBook(b); setIsModalOpen(true); }}
          onDelete={id => setDeleteId(id)}
          onDetail={b => setDetailBook(b)}
        />
        <IonInfiniteScroll
          disabled={displayCount >= sorted.length}
          onIonInfinite={e => {
            setDisplayCount(c => c + PAGE_SIZE);
            (e.target as HTMLIonInfiniteScrollElement).complete();
          }}
        >
          <IonInfiniteScrollContent loadingText="Caricamento..." />
        </IonInfiniteScroll>
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setSelectedBook(null); setIsModalOpen(true); }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      {/* ── Pannello filtri (bottom sheet) ── */}
      <IonModal
        isOpen={filterOpen}
        onDidDismiss={() => setFilterOpen(false)}
        breakpoints={[0, 0.75]}
        initialBreakpoint={0.75}
      >
        <IonContent className="ion-padding">

          {sectionLabel('ORDINA PER')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {SORT_OPTIONS.map(({ key, label }) => (
              <IonChip key={key} color={sortBy === key ? 'primary' : 'medium'} outline={sortBy !== key} onClick={() => setSortBy(key)}>
                <IonLabel>{label}</IonLabel>
              </IonChip>
            ))}
          </div>

          {sectionLabel('FILTRI')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {([
              { label: 'Letti',     value: readFilter,  set: setReadFilter },
              { label: 'Posseduti', value: ownedFilter, set: setOwnedFilter },
            ] as { label: string; value: TriFilter; set: (v: TriFilter) => void }[]).map(({ label, value, set }) => (
              <IonChip
                key={label}
                color={value === null ? 'medium' : value ? 'success' : 'danger'}
                outline={value === null}
                onClick={() => set(value === null ? true : value === true ? false : null)}
              >
                <IonLabel>
                  {value === true ? `✓ ${label}` : value === false ? `✗ ${label}` : label}
                </IonLabel>
              </IonChip>
            ))}
          </div>

          {hasValueFilters && (
            <>
              {sectionLabel('SFOGLIA PER')}
              {allAuthors.length > 0 && (
                <Autocomplete label="Autore" options={allAuthors} value={authorFilter} onChange={setAuthorFilter} />
              )}
              {allSagas.length > 0 && (
                <Autocomplete label="Saga" options={allSagas} value={sagaFilter} onChange={setSagaFilter} />
              )}
              {allGenres.length > 0 && (
                <IonItem lines="full">
                  <IonLabel>Genere</IonLabel>
                  <IonSelect
                    multiple={true}
                    value={genreFilter}
                    placeholder="Tutti"
                    interface="alert"
                    onIonChange={e => setGenreFilter(Array.isArray(e.detail.value) ? e.detail.value : e.detail.value ? [e.detail.value] : [])}
                  >
                    {allGenres.map(g => <IonSelectOption key={g} value={g}>{g}</IonSelectOption>)}
                  </IonSelect>
                </IonItem>
              )}
            </>
          )}

          {activeFilterCount > 0 && (
            <IonButton expand="block" fill="clear" color="danger" onClick={resetFilters} style={{ marginTop: 24 }}>
              Azzera tutti i filtri
            </IonButton>
          )}
        </IonContent>
      </IonModal>

      <BookDetailModal
        book={detailBook}
        isOpen={detailBook !== null}
        onDismiss={() => setDetailBook(null)}
        onEdit={b => { setDetailBook(null); setSelectedBook(b); setIsModalOpen(true); }}
        onUpdate={updateBook}
      />

      <BookModal
        isOpen={isModalOpen}
        onDismiss={() => setIsModalOpen(false)}
        onSave={handleSave}
        book={selectedBook}
      />

      <IonAlert
        isOpen={deleteId !== null}
        header="Elimina Libro"
        message="Sei sicuro di voler eliminare questo elemento?"
        buttons={[
          { text: 'Annulla', role: 'cancel', handler: () => setDeleteId(null) },
          { text: 'Elimina', role: 'destructive', handler: handleDeleteConfirm },
        ]}
        onDidDismiss={() => setDeleteId(null)}
      />
    </IonPage>
  );
};

export default Tab2;
