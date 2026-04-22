import React, { useEffect, useRef, useState } from 'react';
import { IonItem, IonLabel } from '@ionic/react';

interface AutocompleteProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({ label, options, value, onChange, placeholder = 'Tutti' }) => {
  const [inputValue, setInputValue] = useState(value);
  const [showList, setShowList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);

  const filtered = inputValue.trim()
    ? options.filter(o => o.toLowerCase().includes(inputValue.trim().toLowerCase()))
    : options;

  const handleSelect = (opt: string) => {
    onChange(opt);
    setInputValue(opt);
    setShowList(false);
  };

  const handleClear = () => {
    onChange('');
    setInputValue('');
    setShowList(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (!v) onChange('');
    setShowList(true);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowList(false);
        if (!value) setInputValue('');
        else setInputValue(value);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [value]);

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid var(--ion-color-medium)', borderRadius: 8,
        padding: '8px 12px', background: 'var(--ion-item-background)',
      }}>
        <span style={{ fontSize: 14, color: 'var(--ion-color-medium)', minWidth: 70 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginLeft: 12 }}>
          <input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowList(true)}
            placeholder={placeholder}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ion-text-color)',
            }}
          />
          {inputValue && (
            <button
              onMouseDown={e => { e.preventDefault(); handleClear(); }}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px',
                color: 'var(--ion-color-medium)', fontSize: 16, lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {showList && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: 'var(--ion-background-color)', border: '1px solid var(--ion-color-light)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          maxHeight: 200, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={e => { e.preventDefault(); handleSelect(opt); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                borderBottom: '1px solid var(--ion-color-light)',
                background: opt === value ? 'var(--ion-color-primary-tint)' : 'transparent',
                color: opt === value ? 'var(--ion-color-primary)' : 'var(--ion-text-color)',
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

export default Autocomplete;
