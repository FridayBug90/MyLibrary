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
  IonAlert,
  IonChip,
} from '@ionic/react';
import { arrowBackOutline, cameraOutline, closeCircle } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import StarRating from '../shared/StarRating';
import { Bluray, BlurayInput, BlurayStatus, Rating } from '../../types';
import { LookupService, BlurayLookupResult } from '../../services/LookupService';
import { ScannerService } from '../../services/ScannerService';
import { FILM_GENRES } from '../../config/genres';
import DatabaseService from '../../services/DatabaseService';

interface BlurayModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onSave: (data: BlurayInput) => Promise<void>;
  bluray: Bluray | null;
}

type Step = 'lookup' | 'form';

const empty: BlurayInput = {
  title: '', original_title: null, director: null, genre: null, saga: null, volume: null,
  steelbook: false, watched: false, animated: false, status: 'owned', rating: null, notes: null, barcode: null, cover_img: null,
};

const blurInput = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') (e.target as HTMLElement).blur();
};

const sectionLabel = (text: string) => (
  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: 'var(--ion-color-medium)', margin: '20px 0 4px' }}>
    {text}
  </p>
);

const BlurayModal: React.FC<BlurayModalProps> = ({ isOpen, onDismiss, onSave, bluray }) => {
  const [step, setStep] = useState<Step>('lookup');
  const [titleSearchInput, setTitleSearchInput] = useState('');
  const [lookupResult, setLookupResult] = useState<BlurayLookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [form, setForm] = useState<BlurayInput>(empty);
  const [titleError, setTitleError] = useState(false);
  const [dupAlertMsg, setDupAlertMsg] = useState<string | null>(null);
  const [dirInput, setDirInput] = useState('');
  const [allDirectors, setAllDirectors] = useState<string[]>([]);
  const [dirSuggestions, setDirSuggestions] = useState<string[]>([]);
  const [allSagas, setAllSagas] = useState<string[]>([]);
  const [sagaSuggestions, setSagaSuggestions] = useState<string[]>([]);
  const [formSearchInput, setFormSearchInput] = useState('');
  const [formSearching, setFormSearching] = useState(false);
  const [formSearchError, setFormSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    DatabaseService.getDistinctDirectors().then(setAllDirectors);
    DatabaseService.getDistinctBluraySagas().then(setAllSagas);
    if (bluray) {
      setStep('form');
      setForm({
        title: bluray.title, original_title: bluray.original_title,
        director: bluray.director, genre: bluray.genre, saga: bluray.saga, volume: bluray.volume,
        steelbook: bluray.steelbook, watched: bluray.watched, animated: bluray.animated,
        status: bluray.status, rating: bluray.rating,
        notes: bluray.notes, barcode: bluray.barcode, cover_img: bluray.cover_img,
      });
    } else {
      setStep('lookup');
      setTitleSearchInput('');
      setLookupResult(null);
      setLookupError(null);
      setForm(empty);
    }
    setTitleError(false);
    setDirInput('');
    setDirSuggestions([]);
    setSagaSuggestions([]);
    setFormSearchInput('');
    setFormSearching(false);
    setFormSearchError(null);
  }, [isOpen, bluray]);

  const set = <K extends keyof BlurayInput>(key: K, value: BlurayInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const selectedDirectors = form.director ? form.director.split(', ').filter(Boolean) : [];

  const addDirector = (name: string) => {
    const parts = name.split(',').map(s => s.trim()).filter(Boolean);
    const toAdd = parts.filter(p => !selectedDirectors.includes(p));
    if (toAdd.length === 0) return;
    set('director', [...selectedDirectors, ...toAdd].join(', '));
    setDirInput('');
    setDirSuggestions([]);
  };

  const removeDirector = (name: string) => {
    const next = selectedDirectors.filter(d => d !== name);
    set('director', next.length > 0 ? next.join(', ') : null);
  };

  const handleDirInputChange = (value: string) => {
    if (value.includes(',')) {
      const parts = value.split(',');
      const rest = parts.pop()!;
      const toAdd = parts.map(s => s.trim()).filter(Boolean).filter(s => !selectedDirectors.includes(s));
      if (toAdd.length > 0) set('director', [...selectedDirectors, ...toAdd].join(', '));
      setDirInput(rest.trimStart());
      setDirSuggestions([]);
      return;
    }
    setDirInput(value);
    if (value.trim()) {
      setDirSuggestions(
        allDirectors
          .filter(d => !selectedDirectors.includes(d) && d.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 6)
      );
    } else {
      setDirSuggestions([]);
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

  const handleSearch = async () => {
    const query = titleSearchInput.trim();
    if (!query) return;
    setIsSearching(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const result = await LookupService.lookupBlurayByTitle(query);
      if (result) {
        setLookupResult(result);
      } else {
        setLookupError('Nessun film trovato con questo titolo.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLookupError(`Lookup fallito (${msg}). Usa "Inserisci manualmente".`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseResult = () => {
    if (!lookupResult) return;
    setForm(prev => ({
      ...prev,
      title:          lookupResult.title,
      original_title: lookupResult.original_title ?? lookupResult.title,
      director:       lookupResult.director,
      genre:          lookupResult.genre,
      cover_img:      lookupResult.imageUrl,
    }));
    setStep('form');
  };

  const handleFormSearch = async () => {
    const query = formSearchInput.trim();
    if (!query) return;
    setFormSearching(true);
    setFormSearchError(null);
    try {
      const result = await LookupService.lookupBlurayByTitle(query);
      if (result) {
        setForm(prev => ({
          ...prev,
          title:          result.title,
          original_title: result.original_title ?? result.title,
          director:       result.director ?? prev.director,
          genre:          result.genre ?? prev.genre,
          cover_img:      result.imageUrl ?? prev.cover_img,
        }));
        setFormSearchInput('');
      } else {
        setFormSearchError('Nessun film trovato.');
      }
    } catch {
      setFormSearchError('Errore di rete.');
    } finally {
      setFormSearching(false);
    }
  };

  const handleScanBarcode = async () => {
    const value = await ScannerService.scan();
    if (value) set('barcode', value);
  };

  const handleManual = () => {
    setForm({ ...empty, title: titleSearchInput.trim() });
    setStep('form');
  };

  const handleBack = () => {
    if (bluray) { onDismiss(); } else { setStep('lookup'); }
  };

  const isEditMode = !!bluray;

  const formToSaveRef = useRef<BlurayInput>(form);

  const buildFormToSave = (): BlurayInput => {
    const uncommitted = dirInput.trim()
      ? dirInput.split(',').map(s => s.trim()).filter(Boolean).filter(p => !selectedDirectors.includes(p))
      : [];
    return uncommitted.length
      ? { ...form, director: [...selectedDirectors, ...uncommitted].join(', ') }
      : form;
  };

  const doSave = async () => { await onSave(formToSaveRef.current); onDismiss(); };

  const handleSave = async () => {
    formToSaveRef.current = buildFormToSave();
    if (!formToSaveRef.current.title.trim()) { setTitleError(true); return; }
    const excludeId = isEditMode ? bluray!.id : undefined;
    const existing = formToSaveRef.current.barcode
      ? await DatabaseService.findBlurayByBarcode(formToSaveRef.current.barcode, excludeId)
      : await DatabaseService.findBlurayByTitle(formToSaveRef.current.title.trim(), excludeId);
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
              <IonTitle>Cerca Blu-ray</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Titolo del film</IonLabel>
              <IonInput
                value={titleSearchInput}
                onIonInput={e => { setTitleSearchInput(e.detail.value ?? ''); setLookupError(null); setLookupResult(null); }}
                placeholder="es. Il Signore degli Anelli"
                autocapitalize="words"
                enterkeyhint="search"
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              />
            </IonItem>

            <IonButton
              expand="block"
              style={{ marginTop: 12 }}
              onClick={handleSearch}
              disabled={isSearching || !titleSearchInput.trim()}
            >
              {isSearching ? <IonSpinner name="crescent" style={{ marginRight: 8 }} /> : null}
              Cerca
            </IonButton>

            {lookupError && (
              <IonText color="danger">
                <p style={{ textAlign: 'center', marginTop: 16 }}>{lookupError}</p>
              </IonText>
            )}

            {lookupResult && (
              <IonCard style={{ marginTop: 16 }}>
                {lookupResult.imageUrl && (
                  <img
                    src={lookupResult.imageUrl}
                    alt={lookupResult.title}
                    style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#f4f4f4' }}
                  />
                )}
                <IonCardContent>
                  <h2 style={{ fontWeight: 700, margin: 0 }}>{lookupResult.title}</h2>
                  {lookupResult.director && <IonNote>{lookupResult.director}</IonNote>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <IonButton fill="outline" onClick={() => setLookupResult(null)}>
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
              <IonTitle>{isEditMode ? 'Modifica Blu-ray' : 'Nuovo Blu-ray'}</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            {!isEditMode && (
            <>
              <IonItem>
                <IonLabel position="stacked">Cerca su TMDB</IonLabel>
                <IonInput
                  value={formSearchInput}
                  onIonInput={e => { setFormSearchInput(e.detail.value ?? ''); setFormSearchError(null); }}
                  placeholder="es. Il Signore degli Anelli"
                  autocapitalize="words"
                  enterkeyhint="search"
                  onKeyDown={e => { if (e.key === 'Enter') handleFormSearch(); }}
                />
              </IonItem>
              <IonButton
                expand="block"
                fill="outline"
                style={{ marginTop: 8 }}
                onClick={handleFormSearch}
                disabled={formSearching || !formSearchInput.trim()}
              >
                {formSearching ? <IonSpinner name="crescent" style={{ marginRight: 8 }} /> : null}
                Aggiorna campi
              </IonButton>
              {formSearchError && (
                <IonText color="danger">
                  <p style={{ fontSize: 13, textAlign: 'center', margin: '8px 0 0' }}>{formSearchError}</p>
                </IonText>
              )}
              <div style={{ margin: '16px 0 8px', borderTop: '1px solid var(--ion-color-light)' }} />
            </>
          )}

            {sectionLabel('TITOLO')}
            <IonItem>
              <IonLabel position="stacked">Titolo *</IonLabel>
              <IonInput
                value={form.title}
                onIonInput={e => { set('title', e.detail.value ?? ''); setTitleError(false); }}
                placeholder="es. Inception"
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
                placeholder="es. Inception"
                autocapitalize="words"
                enterkeyhint="done"
                onKeyDown={blurInput}
              />
            </IonItem>

            {sectionLabel('DETTAGLI')}
            <IonItem className="item-label-stacked item-has-value">
              <IonLabel position="stacked">Regista</IonLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, width: '100%', paddingTop: 8, paddingBottom: 4 }}>
                {selectedDirectors.map(d => (
                  <IonChip key={d} color="primary" onClick={() => removeDirector(d)} style={{ margin: 0, height: 28 }}>
                    <IonLabel style={{ fontSize: 12 }}>{d}</IonLabel>
                    <IonIcon icon={closeCircle} style={{ fontSize: 14 }} />
                  </IonChip>
                ))}
                <input
                  value={dirInput}
                  onChange={e => handleDirInputChange(e.target.value)}
                  onBlur={() => setTimeout(() => setDirSuggestions([]), 150)}
                  onKeyDown={e => { if (e.key === 'Enter' && dirInput.trim()) { addDirector(dirInput); (e.target as HTMLInputElement).blur(); } }}
                  placeholder={selectedDirectors.length > 0 ? 'Aggiungi...' : 'es. Christopher Nolan'}
                  autoCapitalize="words"
                  style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ion-text-color)', fontSize: 16, fontFamily: 'inherit' }}
                />
              </div>
            </IonItem>
            {dirSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 16px 8px' }}>
                {dirSuggestions.map(d => (
                  <IonChip
                    key={d}
                    outline
                    color="primary"
                    onPointerDown={e => e.preventDefault()}
                    onClick={() => addDirector(d)}
                    style={{ margin: 0 }}
                  >
                    <IonLabel style={{ fontSize: 13 }}>{d}</IonLabel>
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
                placeholder="es. Il Signore degli Anelli"
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
              <IonLabel position="stacked">Parte N°</IonLabel>
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
                {FILM_GENRES.map(g => (
                  <IonSelectOption key={g} value={g}>{g}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {sectionLabel('STATO')}
            <IonItem>
              <IonLabel position="stacked">Stato</IonLabel>
              <IonSelect
                value={form.status}
                onIonChange={e => set('status', e.detail.value as BlurayStatus)}
              >
                <IonSelectOption value="owned">Posseduto</IonSelectOption>
                <IonSelectOption value="wishlist">Wishlist</IonSelectOption>
              </IonSelect>
            </IonItem>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 16px 6px' }}>
              {([
                { key: 'steelbook', label: 'Steelbook' },
                { key: 'animated', label: 'Animazione' },
                { key: 'watched', label: 'Visto' },
              ] as { key: 'steelbook' | 'animated' | 'watched'; label: string }[]).map(({ key, label }) => (
                <IonChip
                  key={key}
                  color={form[key] ? 'primary' : 'medium'}
                  outline={!form[key]}
                  style={{ margin: 0 }}
                  onClick={() => {
                    if (key === 'watched') {
                      const watched = !form.watched;
                      setForm(prev => ({ ...prev, watched, rating: watched ? prev.rating : null }));
                    } else {
                      set(key, !form[key]);
                    }
                  }}
                >
                  <IonLabel>{label}</IonLabel>
                </IonChip>
              ))}
            </div>

            {form.watched && (
              <IonItem>
                <IonLabel position="stacked">Voto</IonLabel>
                <div style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <StarRating value={form.rating} onChange={v => set('rating', v as Rating)} size={20} />
                </div>
              </IonItem>
            )}

            {sectionLabel('EXTRA')}
            <IonItem>
              <IonLabel position="stacked">Barcode (UPC/EAN)</IonLabel>
              <IonInput
                value={form.barcode ?? ''}
                onIonInput={e => set('barcode', e.detail.value || null)}
                placeholder="es. 5051892227773"
                inputmode="numeric"
                enterkeyhint="done"
                onKeyDown={blurInput}
              />
              {ScannerService.isAvailable() && (
                <IonButton slot="end" fill="clear" onClick={handleScanBarcode}>
                  <IonIcon slot="icon-only" icon={cameraOutline} />
                </IonButton>
              )}
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

export default BlurayModal;
