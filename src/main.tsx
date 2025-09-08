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
