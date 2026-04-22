import React, { useState, useEffect, useRef } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonButtons,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonText,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonNote,
  IonIcon,
  IonAlert,
  IonChip,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { arrowBackOutline, cameraOutline, closeCircle } from 'ionicons/icons';
import StarRating from '../shared/StarRating';
import { Book, BookInput, BookStatus, Rating } from '../../types';
import { LookupService, BookLookupResult } from '../../services/LookupService';
import { ScannerService } from '../../services/ScannerService';
import { BOOK_GENRES } from '../../config/genres';
import DatabaseService from '../../services/DatabaseService';

interface BookModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onSave: (data: BookInput) => Promise<void>;
  book: Book | null;
}

type Step = 'lookup' | 'form';

const empty: BookInput = {
  title: '', original_title: null, author: null, genre: null,
  isbn: null, saga: null, volume: null, read: false, status: 'owned', rating: null, notes: null, cover_img: null,
};

const blurInput = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') (e.target as HTMLElement).blur();
};

const sectionLabel = (text: string) => (
  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: 'var(--ion-color-medium)', margin: '20px 0 4px' }}>
    {text}
  </p>
);

const BookModal: React.FC<BookModalProps> = ({ isOpen, onDismiss, onSave, book }) => {
  const [step, setStep] = useState<Step>('lookup');
  const [lookupMode, setLookupMode] = useState<'isbn' | 'title'>('isbn');
  const [isbnInput, setIsbnInput] = useState('');
  const [titleSearchInput, setTitleSearchInput] = useState('');
  const [lookupResult, setLookupResult] = useState<BookLookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [form, setForm] = useState<BookInput>(empty);
  const [titleError, setTitleError] = useState(false);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [dupAlertMsg, setDupAlertMsg] = useState<string | null>(null);
  const [authorInput, setAuthorInput] = useState('');
  const [allAuthors, setAllAuthors] = useState<string[]>([]);
  const [authorSuggestions, setAuthorSuggestions] = useState<string[]>([]);
  const [allSagas, setAllSagas] = useState<string[]>([]);
  const [sagaSuggestions, setSagaSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    DatabaseService.getDistinctAuthors().then(setAllAuthors);
    DatabaseService.getDistinctBookSagas().then(setAllSagas);
    if (book) {
      setStep('form');
      setForm({
        title: book.title, original_title: book.original_title,
        author: book.author, genre: book.genre, isbn: book.isbn,
        saga: book.saga, volume: book.volume, read: book.read,
        status: book.status, rating: book.rating, notes: book.notes, cover_img: book.cover_img,
      });
    } else {
      setStep('lookup');
      setLookupMode('isbn');
      setIsbnInput('');
      setTitleSearchInput('');
      setLookupResult(null);
      setLookupError(null);
      setDupWarning(null);
      setForm(empty);
    }
    setTitleError(false);
    setAuthorInput('');
    setAuthorSuggestions([]);
    setSagaSuggestions([]);
  }, [isOpen, book]);

  const set = <K extends keyof BookInput>(key: K, value: BookInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const selectedAuthors = form.author ? form.author.split(', ').filter(Boolean) : [];

  const addAuthor = (name: string) => {
    const parts = name.split(',').map(s => s.trim()).filter(Boolean);
    const toAdd = parts.filter(p => !selectedAuthors.includes(p));
    if (toAdd.length === 0) return;
    set('author', [...selectedAuthors, ...toAdd].join(', '));
    setAuthorInput('');
    setAuthorSuggestions([]);
  };

  const removeAuthor = (name: string) => {
    const next = selectedAuthors.filter(a => a !== name);
    set('author', next.length > 0 ? next.join(', ') : null);
  };

  const handleAuthorInputChange = (value: string) => {
    if (value.includes(',')) {
      const parts = value.split(',');
      const rest = parts.pop()!;
      const toAdd = parts.map(s => s.trim()).filter(Boolean).filter(s => !selectedAuthors.includes(s));
      if (toAdd.length > 0) set('author', [...selectedAuthors, ...toAdd].join(', '));
      setAuthorInput(rest.trimStart());
      setAuthorSuggestions([]);
      return;
    }
    setAuthorInput(value);
    if (value.trim()) {
      setAuthorSuggestions(
        allAuthors
          .filter(a => !selectedAuthors.includes(a) && a.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 6)
      );
    } else {
      setAuthorSuggestions([]);
    }
  };

  const handleSagaInput = (value: string) => {
    set('saga', value || null);
    if (value.trim()) {
      setSagaSuggestions(
        allSagas.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
      );
    } else {
      setSagaSuggestions([]);
    }
  };

  const checkDupByISBN = async (isbn: string) => {
    const found = await DatabaseService.findBookByISBN(isbn);
    setDupWarning(found ? found.title : null);
  };

  const handleSearch = async () => {
    const query = lookupMode === 'isbn' ? isbnInput.trim() : titleSearchInput.trim();
    if (!query) return;
    setIsSearching(true);
    setLookupError(null);
    setLookupResult(null);
    setDupWarning(null);
    try {
      const result = lookupMode === 'isbn'
        ? await LookupService.lookupBookByISBN(query)
        : await LookupService.lookupBookByTitle(query);
      if (result) {
        setLookupResult(result);
        if (result.isbn) await checkDupByISBN(result.isbn);
      } else {
        setLookupError(lookupMode === 'isbn'
          ? 'Nessun risultato trovato per questo ISBN.'
          : 'Nessun libro trovato con questo titolo.');
        if (lookupMode === 'isbn') await checkDupByISBN(query);
      }
    } catch {
      setLookupError('Errore di rete. Controlla la connessione.');
      if (lookupMode === 'isbn') await checkDupByISBN(query);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseResult = () => {
    if (!lookupResult) return;
    setForm(prev => ({
      ...prev,
      title:          lookupResult.title,
      original_title: lookupResult.title,
      author:         lookupResult.author,
      isbn:           lookupResult.isbn,
      cover_img:      lookupResult.coverUrl ?? null,
    }));
    setStep('form');
  };

  const handleScan = async () => {
    const value = await ScannerService.scan();
    if (!value) return;
    setIsbnInput(value);
    setIsSearching(true);
    setLookupError(null);
    setLookupResult(null);
    setDupWarning(null);
    try {
      const result = await LookupService.lookupBookByISBN(value);
      if (result) {
        setLookupResult(result);
        await checkDupByISBN(value);
      } else {
        setLookupError('Nessun risultato trovato per questo ISBN.');
        await checkDupByISBN(value);
      }
    } catch {
      setLookupError('Errore di rete. Controlla la connessione.');
      await checkDupByISBN(value);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManual = () => {
    setForm({
      ...empty,
      isbn: isbnInput.trim() || null,
      original_title: lookupMode === 'title' ? titleSearchInput.trim() || null : null,
    });
    setStep('form');
  };

  const handleBack = () => {
    if (book) { onDismiss(); } else { setStep('lookup'); }
  };

  const isEditMode = !!book;

  const formToSaveRef = useRef<BookInput>(form);

  const buildFormToSave = (): BookInput => {
    const uncommitted = authorInput.trim()
      ? authorInput.split(',').map(s => s.trim()).filter(Boolean).filter(p => !selectedAuthors.includes(p))
      : [];
    return uncommitted.length
      ? { ...form, author: [...selectedAuthors, ...uncommitted].join(', ') }
      : form;
  };

  const doSave = async () => { await onSave(formToSaveRef.current); onDismiss(); };

  const handleSave = async () => {
    formToSaveRef.current = buildFormToSave();
    if (!formToSaveRef.current.title.trim()) { setTitleError(true); return; }
    const excludeId = isEditMode ? book!.id : undefined;
    const existing = formToSaveRef.current.isbn
      ? await DatabaseService.findBookByISBN(formToSaveRef.current.isbn, excludeId)
      : await DatabaseService.findBookByTitle(formToSaveRef.current.title.trim(), excludeId);
    if (existing) {
      setDupAlertMsg(`"${existing.title}" è già in libreria. Salvare comunque?`);
      return;
    }
    await doSave();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      {step === 'lookup' && (
        <>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={onDismiss}>Annulla</IonButton>
              </IonButtons>
              <IonTitle>Cerca Libro</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonSegment
              value={lookupMode}
              onIonChange={e => {
                setLookupMode(e.detail.value as 'isbn' | 'title');
                setLookupError(null);
                setLookupResult(null);
                setDupWarning(null);
              }}
              style={{ marginBottom: 16 }}
            >
              <IonSegmentButton value="isbn">
                <IonLabel>ISBN</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="title">
                <IonLabel>Titolo</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {lookupMode === 'isbn' ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">ISBN</IonLabel>
                  <IonInput
                    value={isbnInput}
                    onIonInput={e => { setIsbnInput(e.detail.value ?? ''); setLookupError(null); setLookupResult(null); }}
                    placeholder="es. 9788845256349"
                    inputmode="numeric"
                    enterkeyhint="search"
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  />
                </IonItem>
                {ScannerService.isAvailable() && (
                  <IonButton
                    expand="block"
                    fill="outline"
                    style={{ marginTop: 8 }}
                    onClick={handleScan}
                    disabled={isSearching}
                  >
                    <IonIcon slot="start" icon={cameraOutline} />
                    Scansiona ISBN
                  </IonButton>
                )}
              </>
            ) : (
              <IonItem>
                <IonLabel position="stacked">Titolo del libro</IonLabel>
                <IonInput
                  value={titleSearchInput}
                  onIonInput={e => { setTitleSearchInput(e.detail.value ?? ''); setLookupError(null); setLookupResult(null); }}
                  placeholder="es. Il Nome della Rosa"
                  autocapitalize="words"
                  enterkeyhint="search"
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                />
              </IonItem>
            )}

            <IonButton
              expand="block"
              style={{ marginTop: 12 }}
              onClick={handleSearch}
              disabled={isSearching || (lookupMode === 'isbn' ? !isbnInput.trim() : !titleSearchInput.trim())}
            >
              {isSearching ? <IonSpinner name="crescent" style={{ marginRight: 8 }} /> : null}
              Cerca
            </IonButton>

            {lookupError && (
              <IonText color="danger">
                <p style={{ textAlign: 'center', marginTop: 16 }}>{lookupError}</p>
              </IonText>
            )}
            {dupWarning && !lookupResult && (
              <IonText color="warning">
                <p style={{ textAlign: 'center', marginTop: 8, fontWeight: 600 }}>⚠ Già in libreria: "{dupWarning}"</p>
              </IonText>
            )}

            {lookupResult && (
              <IonCard style={{ marginTop: 16 }}>
                {lookupResult.coverUrl && (
                  <img
                    src={lookupResult.coverUrl}
                    alt={lookupResult.title}
                    style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#f4f4f4' }}
                  />
                )}
                <IonCardContent>
                  <h2 style={{ fontWeight: 700, margin: 0 }}>{lookupResult.title}</h2>
                  {lookupResult.author && <IonNote>{lookupResult.author}</IonNote>}
                  {dupWarning && (
                    <IonText color="warning">
                      <p style={{ marginTop: 8, fontWeight: 600 }}>⚠ Già in libreria: "{dupWarning}"</p>
                    </IonText>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <IonButton fill="outline" onClick={() => { setLookupResult(null); setIsbnInput(''); }}>
                      <IonIcon slot="start" icon={arrowBackOutline} />
                      Cerca ancora
                    </IonButton>
                    <IonButton onClick={handleUseResult}>
                      Usa questi dati
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            )}

            <div style={{ marginTop: 32, borderTop: '1px solid var(--ion-color-light)', paddingTop: 16 }}>
              <IonButton expand="block" fill="clear" onClick={handleManual}>
                Inserisci manualmente →
              </IonButton>
            </div>
          </IonContent>
        </>
      )}

      {step === 'form' && (
        <>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={handleBack}>
                  {isEditMode ? 'Annulla' : <><IonIcon icon={arrowBackOutline} /> Indietro</>}
                </IonButton>
              </IonButtons>
              <IonTitle>{isEditMode ? 'Modifica Libro' : 'Nuovo Libro'}</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {sectionLabel('TITOLO')}
            <IonItem>
              <IonLabel position="stacked">Titolo *</IonLabel>
              <IonInput
                value={form.title}
                onIonInput={e => { set('title', e.detail.value ?? ''); setTitleError(false); }}
                placeholder="es. Il Nome della Rosa"
                autocapitalize="words"
                enterkeyhint="done"
                onKeyDown={blurInput}
              />
              {titleError && <IonText color="danger"><p style={{ fontSize: 12 }}>Il titolo è obbligatorio</p></IonText>}
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Titolo originale</IonLabel>
              <IonInput
                value={form.original_title ?? ''}
                onIonInput={e => set('original_title', e.detail.value || null)}
                placeholder="es. The Name of the Rose"
                autocapitalize="words"
                enterkeyhint="done"
                onKeyDown={blurInput}
              />
            </IonItem>

            {sectionLabel('DETTAGLI')}
            <IonItem className="item-label-stacked item-has-value">
              <IonLabel position="stacked">Autore</IonLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, width: '100%', paddingTop: 8, paddingBottom: 4 }}>
                {selectedAuthors.map(a => (
                  <IonChip key={a} color="primary" onClick={() => removeAuthor(a)} style={{ margin: 0, height: 28 }}>
                    <IonLabel style={{ fontSize: 12 }}>{a}</IonLabel>
                    <IonIcon icon={closeCircle} style={{ fontSize: 14 }} />
                  </IonChip>
                ))}
                <input
                  value={authorInput}
                  onChange={e => handleAuthorInputChange(e.target.value)}
                  onBlur={() => setTimeout(() => setAuthorSuggestions([]), 150)}
                  onKeyDown={e => { if (e.key === 'Enter' && authorInput.trim()) { addAuthor(authorInput); (e.target as HTMLInputElement).blur(); } }}
                  placeholder={selectedAuthors.length > 0 ? 'Aggiungi...' : 'es. Umberto Eco'}
                  autoCapitalize="words"
                  style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ion-text-color)', fontSize: 16, fontFamily: 'inherit' }}
                />
              </div>
            </IonItem>
            {authorSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 16px 8px' }}>
                {authorSuggestions.map(a => (
                  <IonChip
                    key={a}
                    outline
                    color="primary"
                    onPointerDown={e => e.preventDefault()}
                    onClick={() => addAuthor(a)}
                    style={{ margin: 0 }}
                  >
                    <IonLabel style={{ fontSize: 13 }}>{a}</IonLabel>
                  </IonChip>
                ))}
              </div>
            )}

            <IonItem>
              <IonLabel position="stacked">Saga / Serie</IonLabel>
              <IonInput
                value={form.saga ?? ''}
                onIonInput={e => handleSagaInput(e.detail.value ?? '')}
                onIonBlur={() => setTimeout(() => setSagaSuggestions([]), 150)}
                placeholder="es. Harry Potter"
                autocapitalize="words"
                enterkeyhint="done"
                onKeyDown={blurInput}
              />
            </IonItem>
            {sagaSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 16px 8px' }}>
                {sagaSuggestions.map(s => (
                  <IonChip
                    key={s}
                    outline
                    color="secondary"
                    onPointerDown={e => e.preventDefault()}
                    onClick={() => { set('saga', s); setSagaSuggestions([]); }}
                    style={{ margin: 0 }}
                  >
                    <IonLabel style={{ fontSize: 13 }}>{s}</IonLabel>
                  </IonChip>
                ))}
              </div>
            )}

            <IonItem>
              <IonLabel position="stacked">Volume N°</IonLabel>
              <IonInput
                value={form.volume !== null ? String(form.volume) : ''}
                onIonInput={e => set('volume', e.detail.value ? parseInt(e.detail.value, 10) : null)}
                placeholder="es. 1"
                inputmode="numeric"
                type="number"
                enterkeyhint="done"
                onKeyDown={blurInput}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Genere</IonLabel>
              <IonSelect
                multiple={true}
                value={form.genre ? form.genre.split(', ') : []}
                onIonChange={e => set('genre', (e.detail.value as string[]).join(', ') || null)}
                placeholder="Seleziona generi"
              >
                {BOOK_GENRES.map(g => (
                  <IonSelectOption key={g} value={g}>{g}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {sectionLabel('STATO')}
            <IonItem>
              <IonLabel position="stacked">Stato</IonLabel>
              <IonSelect
                value={form.status}
                onIonChange={e => set('status', e.detail.value as BookStatus)}
              >
                <IonSelectOption value="owned">Posseduto</IonSelectOption>
                <IonSelectOption value="wishlist">Wishlist</IonSelectOption>
              </IonSelect>
            </IonItem>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 16px 6px' }}>
              {([{ key: 'read', label: 'Letto' }] as { key: 'read'; label: string }[]).map(({ key, label }) => (
                <IonChip
                  key={key}
                  color={form[key] ? 'tertiary' : 'medium'}
                  outline={!form[key]}
                  style={{ margin: 0 }}
                  onClick={() => setForm(prev => ({ ...prev, [key]: !prev[key], rating: prev[key] ? null : prev.rating }))}
                >
                  <IonLabel>{label}</IonLabel>
                </IonChip>
              ))}
            </div>

            {form.read && (
              <IonItem>
                <IonLabel position="stacked">Voto</IonLabel>
                <div style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <StarRating value={form.rating} onChange={v => set('rating', v as Rating)} size={20} />
                </div>
              </IonItem>
            )}

            {sectionLabel('EXTRA')}
            <IonItem>
              <IonLabel position="stacked">ISBN</IonLabel>
              <IonInput
                value={form.isbn ?? ''}
                onIonInput={e => set('isbn', e.detail.value || null)}
                placeholder="es. 9788845256349"
                inputmode="numeric"
                enterkeyhint="done"
                onKeyDown={blurInput}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Note</IonLabel>
              <IonTextarea
                value={form.notes ?? ''}
                onIonInput={e => set('notes', e.detail.value || null)}
                rows={3}
                placeholder="Note personali..."
              />
            </IonItem>
          </IonContent>

          <IonFooter>
            <IonToolbar>
              <IonButton expand="block" onClick={handleSave} style={{ margin: '8px 16px' }}>
                Salva
              </IonButton>
            </IonToolbar>
          </IonFooter>
        </>
      )}
      <IonAlert
        isOpen={dupAlertMsg !== null}
        header="Già in libreria"
        message={dupAlertMsg ?? ''}
        buttons={[
          { text: 'Annulla', role: 'cancel', handler: () => setDupAlertMsg(null) },
          { text: 'Salva comunque', handler: () => { setDupAlertMsg(null); doSave(); } },
        ]}
        onDidDismiss={() => setDupAlertMsg(null)}
      />
    </IonModal>
  );
};

export default BookModal;
