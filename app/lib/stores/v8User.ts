import { atom } from 'nanostores';
import * as Sentry from '@sentry/remix';
import { type V8User } from '~/lib/verse8/userAuth';

export const v8UserStore = atom<{ loading: boolean; user: V8User | null }>({
  loading: false,
  user: null,
});

// Sync Sentry user context whenever v8UserStore changes
v8UserStore.subscribe((state) => {
  if (state.user) {
    Sentry.setUser({
      id: state.user.userUid,
      email: state.user.email,
      walletAddress: state.user.walletAddress || undefined,
    });
  } else if (!state.loading) {
    // User logged out or not authenticated
    Sentry.setUser(null);
  }
});
