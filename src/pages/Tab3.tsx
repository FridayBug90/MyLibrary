import React, { useEffect, useRef, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonText,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { personCircleOutline, closeCircle } from 'ionicons/icons';
import { useLibrary } from '../context/LibraryContext';
import { useBackupUI } from '../hooks/useBackupUI';
import StarRating from '../components/shared/StarRating';
import AccountModal from '../components/shared/AccountModal';
import DatabaseService from '../services/DatabaseService';
import { DirectorStats, AuthorStats, Rating } from '../types';

// ---- Autocomplete ----
interface AutocompleteProps {
  options: string[];
  value: string | null;
  placeholder: string;
  color: string;
  onChange: (v: string | null) => void;
}
const Autocomplete: React.FC<AutocompleteProps> = ({ options, value, placeholder, color, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
        <div style={{
          flex: 1,
          padding: '10px 14px',
          borderRadius: 10,
          border: `1.5px solid var(--ion-color-${color})`,
          background: 'var(--ion-color-light)',
          fontWeight: 700,
          fontSize: 15,
          color: `var(--ion-color-${color})`,
        }}>
          {value}
        </div>
        <IonButton fill="clear" onClick={() => onChange(null)} style={{ '--padding-start': '4px', '--padding-end': '4px' }}>
          <IonIcon icon={closeCircle} style={{ color: 'var(--ion-color-medium)', fontSize: 22 }} />
        </IonButton>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', padding: '8px 16px' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '11px 14px',
          borderRadius: 10,
          border: '1.5px solid var(--ion-color-light)',
          background: 'var(--ion-item-background)',
          color: 'var(--ion-text-color)',
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 16,
          right: 16,
          background: 'var(--ion-card-background)',
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {filtered.map((opt, i) => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setQuery(''); setOpen(false); }}
              onTouchEnd={() => { onChange(opt); setQuery(''); setOpen(false); }}
              style={{
                padding: '12px 16px',
                fontSize: 14,
                borderBottom: i < filtered.length - 1 ? '1px solid var(--ion-color-light)' : 'none',
                cursor: 'pointer',
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---- Animated number ----
const AnimatedNumber: React.FC<{ value: number; color?: string; style?: React.CSSProperties }> = ({ value, color, style }) => {
  const [display, setDisplay] = useState(0);
  const animRef = useRef<number>();
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 550;
    const startTime = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) { animRef.current = requestAnimationFrame(animate); }
      else { prevRef.current = end; }
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [value]);

  return <span style={{ color, ...style }}>{display}</span>;
};

// ---- Animated bar ----
const AnimBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(max > 0 ? (value / max) * 100 : 0), 60);
    return () => clearTimeout(t);
  }, [value, max]);
  return (
    <div style={{ background: 'var(--ion-color-light)', borderRadius: 4, height: 7, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${width}%`, height: '100%', background: color, transition: 'width 0.65s cubic-bezier(0.4,0,0.2,1)', borderRadius: 4 }} />
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
      <span style={{ color: 'var(--ion-color-medium)' }}>{label}</span>
      <AnimatedNumber value={value} style={{ fontWeight: 700, fontSize: 13 }} />
    </div>
    <AnimBar value={value} max={max} color={color} />
  </div>
);

// ---- Stats cards ----
const DirectorCard: React.FC<{ stats: DirectorStats }> = ({ stats }) => (
  <div style={{ background: 'var(--ion-card-background)', borderRadius: 16, padding: '20px 20px 16px', margin: '0 16px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', animation: 'fadeSlideIn 0.35s ease' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
      <AnimatedNumber value={stats.total} color="var(--ion-color-primary)" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }} />
      <span style={{ fontSize: 14, color: 'var(--ion-color-medium)' }}>film</span>
    </div>
    <StatRow label="Posseduti" value={stats.owned} max={stats.total} color="var(--ion-color-success)" />
    <StatRow label="Wishlist" value={stats.wishlist} max={stats.total} color="var(--ion-color-warning)" />
    <StatRow label="Visti" value={stats.watched} max={stats.total} color="var(--ion-color-primary)" />
    {stats.steelbook > 0 && <StatRow label="Steelbook" value={stats.steelbook} max={stats.total} color="var(--ion-color-tertiary)" />}
    {stats.animated > 0 && <StatRow label="Animazione" value={stats.animated} max={stats.total} color="var(--ion-color-secondary)" />}
    {stats.avgRating !== null && (
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--ion-color-light)' }}>
        <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', marginBottom: 6 }}>Voto medio</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StarRating value={Math.round(stats.avgRating) as Rating} readonly />
          <span style={{ fontWeight: 700, fontSize: 16 }}>{stats.avgRating.toFixed(1)}</span>
        </div>
      </div>
    )}
    {stats.genres.length > 0 && (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', marginBottom: 8 }}>Generi</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stats.genres.slice(0, 6).map(g => (
            <span key={g} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--ion-color-light)', color: 'var(--ion-color-dark)' }}>{g}</span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const AuthorCard: React.FC<{ stats: AuthorStats }> = ({ stats }) => (
  <div style={{ background: 'var(--ion-card-background)', borderRadius: 16, padding: '20px 20px 16px', margin: '0 16px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', animation: 'fadeSlideIn 0.35s ease' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
      <AnimatedNumber value={stats.total} color="var(--ion-color-secondary)" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }} />
      <span style={{ fontSize: 14, color: 'var(--ion-color-medium)' }}>{stats.total === 1 ? 'libro' : 'libri'}</span>
    </div>
    <StatRow label="Posseduti" value={stats.owned} max={stats.total} color="var(--ion-color-success)" />
    <StatRow label="Letti" value={stats.read} max={stats.total} color="var(--ion-color-tertiary)" />
    <StatRow label="Wishlist" value={stats.wishlist} max={stats.total} color="var(--ion-color-warning)" />
    {stats.avgRating !== null && (
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--ion-color-light)' }}>
        <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', marginBottom: 6 }}>Voto medio</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StarRating value={Math.round(stats.avgRating) as Rating} readonly />
          <span style={{ fontWeight: 700, fontSize: 16 }}>{stats.avgRating.toFixed(1)}</span>
        </div>
      </div>
    )}
    {stats.genres.length > 0 && (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', marginBottom: 8 }}>Generi</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stats.genres.slice(0, 6).map(g => (
            <span key={g} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--ion-color-light)', color: 'var(--ion-color-dark)' }}>{g}</span>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ---- Main ----
const Tab3: React.FC = () => {
  const { stats, refreshStats, loadBlurays, loadBooks } = useLibrary();
  const backup = useBackupUI();
  const [accountOpen, setAccountOpen] = useState(false);
  const [segment, setSegment] = useState<'registi' | 'autori'>('registi');

  const [directors, setDirectors] = useState<string[]>([]);
  const [selDir, setSelDir] = useState<string | null>(null);
  const [dirStats, setDirStats] = useState<DirectorStats | null>(null);

  const [authors, setAuthors] = useState<string[]>([]);
  const [selAuth, setSelAuth] = useState<string | null>(null);
  const [authStats, setAuthStats] = useState<AuthorStats | null>(null);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  useEffect(() => {
    DatabaseService.getDirectorsWithCount().then(d => setDirectors(d.map(x => x.director)));
    DatabaseService.getAuthorsWithCount().then(a => setAuthors(a.map(x => x.author)));
  }, []);

  useEffect(() => {
    if (!selDir) { setDirStats(null); return; }
    DatabaseService.getStatsByDirector(selDir).then(setDirStats);
  }, [selDir]);

  useEffect(() => {
    if (!selAuth) { setAuthStats(null); return; }
    DatabaseService.getStatsByAuthor(selAuth).then(setAuthStats);
  }, [selAuth]);

  const handleRefresh = async (e: CustomEvent) => {
    await refreshStats();
    const [dirs, auths] = await Promise.all([
      DatabaseService.getDirectorsWithCount(),
      DatabaseService.getAuthorsWithCount(),
    ]);
    setDirectors(dirs.map(x => x.director));
    setAuthors(auths.map(x => x.author));
    if (selDir) setDirStats(await DatabaseService.getStatsByDirector(selDir));
    if (selAuth) setAuthStats(await DatabaseService.getStatsByAuthor(selAuth));
    (e.detail as { complete: () => void }).complete();
  };

  const s = stats;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Statistiche</IonTitle>
          {backup.isAvailable && (
            <IonButtons slot="end">
              <IonButton onClick={() => setAccountOpen(true)}>
                <IonIcon slot="icon-only" icon={personCircleOutline} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Summary strip */}
        {s && (
          <div style={{ display: 'flex', padding: '14px 16px 10px', borderBottom: '1px solid var(--ion-color-light)' }}>
            {[
              { label: 'Blu-ray', value: s.totalBlurays, color: 'var(--ion-color-primary)' },
              { label: 'Libri',   value: s.totalBooks,   color: 'var(--ion-color-secondary)' },
              { label: 'Visti',   value: s.blurayWatched, color: 'var(--ion-color-success)' },
              { label: 'Letti',   value: s.bookRead,      color: 'var(--ion-color-tertiary)' },
            ].map(({ label, value, color }, i, arr) => (
              <React.Fragment key={label}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--ion-color-medium)', marginTop: 1 }}>{label}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: 1, background: 'var(--ion-color-light)', margin: '4px 0' }} />}
              </React.Fragment>
            ))}
          </div>
        )}

        <IonSegment
          value={segment}
          onIonChange={e => setSegment(e.detail.value as 'registi' | 'autori')}
          style={{ padding: '10px 16px 4px' }}
        >
          <IonSegmentButton value="registi"><IonLabel>Registi</IonLabel></IonSegmentButton>
          <IonSegmentButton value="autori"><IonLabel>Autori</IonLabel></IonSegmentButton>
        </IonSegment>

        {segment === 'registi' && (
          <div style={{ paddingTop: 4 }}>
            <Autocomplete
              options={directors}
              value={selDir}
              placeholder="Cerca regista…"
              color="primary"
              onChange={setSelDir}
            />
            {dirStats && <DirectorCard stats={dirStats} />}
            {!selDir && (
              <IonText color="medium">
                <p style={{ textAlign: 'center', fontSize: 13, padding: '16px 16px 24px' }}>
                  Cerca un regista per vedere le statistiche.
                </p>
              </IonText>
            )}
          </div>
        )}

        {segment === 'autori' && (
          <div style={{ paddingTop: 4 }}>
            <Autocomplete
              options={authors}
              value={selAuth}
              placeholder="Cerca autore…"
              color="secondary"
              onChange={setSelAuth}
            />
            {authStats && <AuthorCard stats={authStats} />}
            {!selAuth && (
              <IonText color="medium">
                <p style={{ textAlign: 'center', fontSize: 13, padding: '16px 16px 24px' }}>
                  Cerca un autore per vedere le statistiche.
                </p>
              </IonText>
            )}
          </div>
        )}
      </IonContent>

      <AccountModal
        isOpen={accountOpen}
        onDismiss={() => setAccountOpen(false)}
        backup={backup}
        onRestoreComplete={() => { loadBlurays(); loadBooks(); refreshStats(); }}
      />

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </IonPage>
  );
};

export default Tab3;
