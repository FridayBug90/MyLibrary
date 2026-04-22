import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';
import { Capacitor } from '@capacitor/core';

defineJeepSqlite(window);

const startApp = async () => {
  if (Capacitor.getPlatform() === 'web') {
    const jeepSqlite = document.createElement('jeep-sqlite');
    document.body.appendChild(jeepSqlite);
    await customElements.whenDefined('jeep-sqlite');
  }

  const container = document.getElementById('root');
  const root = createRoot(container!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

startApp();