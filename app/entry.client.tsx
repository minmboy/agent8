import { RemixBrowser, useLocation, useMatches } from '@remix-run/react';
import { startTransition, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as Sentry from '@sentry/remix';
import { isAbortError } from './utils/errors';

// Initialize Sentry for client-side error monitoring
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: true,

  integrations: [
    Sentry.browserTracingIntegration({
      useEffect,
      useLocation,
      useMatches,
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Performance Monitoring
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev
  tracePropagationTargets: ['localhost', /^https:\/\/.*\.pages\.dev/, /^https:\/\/.*\.verse8\.io/],

  // Session Replay
  replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 0.5, // 10% in production, 50% in dev
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions

  // Environment
  environment: import.meta.env.MODE,
  release: `agent8@${__APP_VERSION || 'dev'}`,

  // Filter noisy errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Ignore aborted requests
    if (isAbortError(error)) {
      return null;
    }

    // Ignore network errors from ad blockers
    if (error instanceof Error && error.message?.includes('Failed to fetch')) {
      return null;
    }

    return event;
  },

  // Only enable in production or when DSN is set
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
