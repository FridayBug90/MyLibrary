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
import BlurayList from '../components/bluray/BlurayList';
import BlurayModal from '../components/bluray/BlurayModal';
import BlurayDetailModal from '../components/bluray/BlurayDetailModal';
import Autocomplete from '../components/shared/Autocomplete';
import { Bluray, BlurayInput } from '../types';

type SortKey = 'title' | 'rating' | 'genre' | 'status' | 'director';
type TriFilter = null | true | false;
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'title',    label: 'Titolo' },
  { key: 'director', label: 'Regista' },
  { key: 'genre',    label: 'Genere' },
  { key: 'rating',   label: 'Voto' },
  { key: 'status',   label: 'Stato' },
];

const PAGE_SIZE = 30;

function sortBlurays(list: Bluray[], key: SortKey): Bluray[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case 'title':    return a.title.localeCompare(b.title);
      case 'rating':   return (b.rating ?? 0) - (a.rating ?? 0);
      case 'genre':    return (a.genre ?? '').localeCompare(b.genre ?? '');
      case 'status':   return a.status.localeCompare(b.status);
      case 'director': return (a.director ?? '').localeCompare(b.director ?? '');
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

const Tab1: React.FC = () => {
  const { blurays, loadBlurays, addBluray, updateBluray, deleteBluray } = useLibrary();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedBluray, setSelectedBluray] = useState<Bluray | null>(null);
  const [detailBluray, setDetailBluray] = useState<Bluray | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('title');
  const [searchQuery, setSearchQuery] = useState('');
  const [steelFilter, setSteelFilter] = useState<TriFilter>(null);
  const [watchedFilter, setWatchedFilter] = useState<TriFilter>(null);
  const [ownedFilter, setOwnedFilter] = useState<TriFilter>(null);
  const [animatedFilter, setAnimatedFilter] = useState<TriFilter>(null);
  const [directorFilter, setDirectorFilter] = useState('');
  const [sagaFilter, setSagaFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  useEffect(() => { loadBlurays(); }, [loadBlurays]);

  const allDirectors = useMemo(() => {
    const s = new Set<string>();
    blurays.forEach(b => b.director?.split(', ').forEach(d => { const t = d.trim(); if (t) s.add(t); }));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [blurays]);

  const allSagas = useMemo(() => {
    const s = new Set<string>();
    blurays.forEach(b => { if (b.saga) s.add(b.saga); });
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [blurays]);

  const allGenres = useMemo(() => {
    const s = new Set<string>();
    blurays.forEach(b => b.genre?.split(', ').forEach(g => { const t = g.trim(); if (t) s.add(t); }));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [blurays]);

  const sorted = useMemo(() => {
    let list = blurays;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.director?.toLowerCase().includes(q)
      );
    }
    if (steelFilter !== null)    list = list.filter(b => b.steelbook === steelFilter);
    if (watchedFilter !== null)  list = list.filter(b => b.watched === watchedFilter);
    if (ownedFilter !== null)    list = list.filter(b => (b.status === 'owned') === ownedFilter);
    if (animatedFilter !== null) list = list.filter(b => b.animated === animatedFilter);
    if (directorFilter) list = list.filter(b => b.director?.split(', ').map(d => d.trim()).includes(directorFilter));
    if (sagaFilter)     list = list.filter(b => b.saga === sagaFilter);
    if (genreFilter.length > 0) list = list.filter(b => genreFilter.every(g => b.genre?.split(', ').map(x => x.trim()).includes(g)));
    if (sagaFilter) return [...list].sort((a, b) => (a.volume ?? Infinity) - (b.volume ?? Infinity));
    return sortBlurays(list, sortBy);
  }, [blurays, searchQuery, sortBy, steelFilter, watchedFilter, ownedFilter, animatedFilter, directorFilter, sagaFilter, genreFilter]);

  useEffect(() => { setDisplayCount(PAGE_SIZE); }, [sorted]);

  const visibleBlurays = useMemo(() => sorted.slice(0, displayCount), [sorted, displayCount]);

  const activeFilterCount =
    (steelFilter !== null ? 1 : 0) +
    (watchedFilter !== null ? 1 : 0) +
    (ownedFilter !== null ? 1 : 0) +
    (animatedFilter !== null ? 1 : 0) +
    (directorFilter ? 1 : 0) +
    (sagaFilter ? 1 : 0) +
    (genreFilter.length > 0 ? 1 : 0);

  const resetFilters = () => {
    setSteelFilter(null); setWatchedFilter(null); setOwnedFilter(null); setAnimatedFilter(null);
    setDirectorFilter(''); setSagaFilter(''); setGenreFilter([]);
  };

  const handleSave = async (data: BlurayInput) => {
    if (selectedBluray) await updateBluray(selectedBluray.id, data);
    else await addBluray(data);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId !== null) { await deleteBluray(deleteId); setDeleteId(null); }
  };

  const hasValueFilters = allDirectors.length > 0 || allSagas.length > 0 || allGenres.length > 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Blu-ray</IonTitle>
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
            placeholder="Cerca titolo o regista..."
            onIonInput={e => setSearchQuery(e.detail.value ?? '')}
            debounce={300}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await loadBlurays(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <BlurayList
          blurays={visibleBlurays}
          onEdit={b => { setSelectedBluray(b); setIsModalOpen(true); }}
          onDelete={id => setDeleteId(id)}
          onDetail={b => setDetailBluray(b)}
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
          <IonFabButton onClick={() => { setSelectedBluray(null); setIsModalOpen(true); }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      {/* ── Pannello filtri (bottom sheet) ── */}
      <IonModal
        isOpen={filterOpen}
        onDidDismiss={() => setFilterOpen(false)}
        breakpoints={[0, 0.85]}
        initialBreakpoint={0.85}
      >
        <div style={{ overflowY: 'auto', height: '100%', padding: '16px' }}>

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
              { label: 'Steelbook',  value: steelFilter,    set: setSteelFilter },
              { label: 'Animazione', value: animatedFilter, set: setAnimatedFilter },
              { label: 'Visti',      value: watchedFilter,  set: setWatchedFilter },
              { label: 'Posseduti',  value: ownedFilter,    set: setOwnedFilter },
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
              {allDirectors.length > 0 && (
                <Autocomplete label="Regista" options={allDirectors} value={directorFilter} onChange={setDirectorFilter} />
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
        </div>
      </IonModal>

      <BlurayDetailModal
        bluray={detailBluray}
        isOpen={detailBluray !== null}
        onDismiss={() => setDetailBluray(null)}
        onEdit={b => { setDetailBluray(null); setSelectedBluray(b); setIsModalOpen(true); }}
        onUpdate={updateBluray}
      />

      <BlurayModal
        isOpen={isModalOpen}
        onDismiss={() => setIsModalOpen(false)}
        onSave={handleSave}
        bluray={selectedBluray}
      />

      <IonAlert
        isOpen={deleteId !== null}
        header="Elimina Blu-ray"
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

export default Tab1;
