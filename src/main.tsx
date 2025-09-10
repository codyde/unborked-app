import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import * as Sentry from "@sentry/react";
import { fetchServerDefaults, setFeatureFlag, getCurrentFlagMap } from './utils/featureFlags';

Sentry.init({
  dsn: "https://4cce768b3178c61875e8f1a8e039294b@o4508130833793024.ingest.us.sentry.io/4509088007585792",

  enableLogs: true,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.featureFlagsIntegration(),
  ],

  tracesSampleRate: 1.0,
  tracePropagationTargets: ["http://localhost:3001"],

  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  // debug: true
});

const { info, warn, error, fmt } = Sentry.logger;


(async () => {
  try {
    // Assign a virtual-user token per browser context/session and tag in Sentry
    try {
      const STORAGE_KEY = 'vuToken';
      let token = localStorage.getItem(STORAGE_KEY);
      if (!token) {
        // Prefer crypto.randomUUID when available
        // Fallback creates a simple pseudo-random string
        const gen = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `vu_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
        token = gen();
        localStorage.setItem(STORAGE_KEY, token);
      }
      Sentry.setTag('vu', token);
      Sentry.setContext('virtualUser', { token });
    } catch (e) {
      // Non-fatal; proceed without tagging if storage unavailable
    }

    info(fmt`Initializing application...`);
    const serverDefaults = await fetchServerDefaults();

    Object.entries(serverDefaults).forEach(([flag, value]) => {
      setFeatureFlag(flag, Boolean(value));
    });

    await getCurrentFlagMap();

    createRoot(document.getElementById('root')!).render(
      <>
        <App />
      </>
    );
  } catch (err: any) {
    error(fmt`❌ Failed to initialize application: ${err.message}`, { stack: err.stack, errorObject: err });

    warn(fmt`Rendering application without properly initialized feature flags: ${err.message}`, { stack: err.stack, errorObject: err });
    createRoot(document.getElementById('root')!).render(
      <>
        <App />
      </>
    );
  }
})();
