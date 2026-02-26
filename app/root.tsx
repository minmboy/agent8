import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, isRouteErrorResponse } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';
import { initCaptureService } from './utils/captureService';
import { TurnstileProvider } from './components/turnstile/TurnstileProvider';
import { captureRemixErrorBoundaryError, withSentry } from '@sentry/remix';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&display=swap',
  },
  {
    rel: 'preload',
    href: '/background-gradient.webp',
    as: 'image',
    type: 'image/webp',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    // 항상 다크 테마 사용
    let theme = 'dark';

    // 로컬 스토리지에 다크 테마 저장
    localStorage.setItem('bolt_theme', theme);

    // HTML 요소에 다크 테마 속성 설정
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

const hotjarCode = (() => {
  const siteId = import.meta.env.VITE_HOTJAR_SITE_ID || '6416786';
  return stripIndents`
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:${siteId},hjsv:6};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  `;
})();

const gtmCode = stripIndents`
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W8QT78SH');
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
    <script dangerouslySetInnerHTML={{ __html: gtmCode }} />
    <script dangerouslySetInnerHTML={{ __html: hotjarCode }} />
    {/* Cloudflare Turnstile Script */}
    {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
      <script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js" />
    )}
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  return (
    <>
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-W8QT78SH"
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        ></iframe>
      </noscript>
      <ClientOnly>
        {() => (
          <DndProvider backend={HTML5Backend}>
            {turnstileSiteKey ? <TurnstileProvider siteKey={turnstileSiteKey}>{children}</TurnstileProvider> : children}
          </DndProvider>
        )}
      </ClientOnly>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';
import { initializeSoundSystem } from './utils/sound';

// ErrorBoundary for catching and reporting React errors to Sentry
export function ErrorBoundary() {
  const error = useRouteError();

  // Capture error in Sentry
  captureRemixErrorBoundaryError(error);

  // Handle different error types
  if (isRouteErrorResponse(error)) {
    return (
      <html lang="en" data-theme="dark">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>
            {error.status} - {error.statusText}
          </title>
          <Links />
        </head>
        <body>
          <div className="flex items-center justify-center min-h-screen bg-bolt-elements-background-depth-1">
            <div className="text-center p-8">
              <h1 className="text-6xl font-bold text-bolt-elements-textPrimary mb-4">{error.status}</h1>
              <p className="text-xl text-bolt-elements-textSecondary mb-2">{error.statusText}</p>
              {error.data && <p className="text-sm text-bolt-elements-textTertiary mt-4">{error.data}</p>}
              <a
                href="/"
                className="mt-8 inline-block px-6 py-3 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-lg hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
              >
                Go to Home
              </a>
            </div>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  // Handle unexpected errors
  let errorMessage = 'An unexpected error occurred';
  let errorDetails = '';

  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  }

  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Application Error</title>
        <Links />
      </head>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-bolt-elements-background-depth-1">
          <div className="text-center p-8 max-w-2xl">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-4">Oops! Something went wrong</h1>
            <p className="text-bolt-elements-textSecondary mb-6">
              We apologize for the inconvenience. The error has been reported to our team.
            </p>
            {import.meta.env.MODE === 'development' && (
              <div className="text-left bg-bolt-elements-background-depth-2 p-4 rounded-lg mb-6">
                <p className="text-sm text-bolt-elements-textSecondary font-mono mb-2">{errorMessage}</p>
                {errorDetails && (
                  <pre className="text-xs text-bolt-elements-textTertiary overflow-auto max-h-60">{errorDetails}</pre>
                )}
              </div>
            )}
            <div className="flex gap-4 justify-center">
              <a
                href="/"
                className="px-6 py-3 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-lg hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
              >
                Go to Home
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-bolt-elements-button-secondary-background text-bolt-elements-button-secondary-text rounded-lg hover:bg-bolt-elements-button-secondary-backgroundHover transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    initCaptureService();
    initializeSoundSystem();
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

// Wrap App with Sentry for performance monitoring
export default withSentry(App);
