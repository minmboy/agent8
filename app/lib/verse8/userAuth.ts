import Cookies from 'js-cookie';
import { FetchError } from '~/utils/errors';

export const V8_ACCESS_TOKEN_KEY = 'v8AccessToken';

export const DENY_ACTIONS = {
  PROMPT: 'prompt',
} as const;

export interface V8User {
  userUid: string;
  isActivated: boolean;
  email: string;
  walletAddress: string;
  deny: string[];
}

export const updateV8AccessToken = (v8AccessToken: string) => {
  if (v8AccessToken) {
    Cookies.set(V8_ACCESS_TOKEN_KEY, v8AccessToken);
    localStorage.setItem(V8_ACCESS_TOKEN_KEY, v8AccessToken);
  }
};

export const verifyV8AccessToken = async (
  v8AuthApiEndpoint: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<V8User> => {
  const response = await fetch(v8AuthApiEndpoint + '/v1/auth/verify', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    const serverMessage = await response.text();
    throw new FetchError((serverMessage ?? 'unknown error').trim(), response.status, 'verify_access_token');
  }

  const data = (await response.json()) as Record<string, any>;

  return {
    userUid: data?.userUid ?? data?.userAddress,
    isActivated: data?.isActivated ?? true,
    email: data?.email ?? '',
    walletAddress: data?.walletAddress ?? '',
    deny: Array.isArray(data?.deny) ? data.deny : [],
  };
};
