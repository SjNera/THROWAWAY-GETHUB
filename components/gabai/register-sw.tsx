'use client';

import { useEffect } from 'react';

// Registers public/sw.js so the app can be installed and opens offline.
// Skipped in `next dev` so cached files never hide your latest changes.
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
