import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { masterDataCache } from './components/common/MasterDataInput';
import { patientCache } from './utils/patientCache';

// Ensure in-memory caches are globally accessible on window from initial load
if (typeof window !== 'undefined') {
  window.masterDataCache = masterDataCache;
  window.patientCache = patientCache;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register PWA Service Worker for Offline Caching & App Installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}
