import axios from 'axios';

/**
 * Application error class with notification control
 * All custom errors should extend this to support sendChatError flag
 */
export class AppError extends Error {
  readonly sendChatError?: boolean;
  readonly name: string = 'AppError';

  constructor(message: string, options?: { sendChatError?: boolean }) {
    super(message);
    this.sendChatError = options?.sendChatError;
  }
}

/**
 * Custom error class for fetch/HTTP errors with status code
 */
export class FetchError extends AppError {
  readonly name: string = 'FetchError';

  constructor(
    message: string,
    public status: number,
    public context?: string,
    options?: { sendChatError?: boolean },
  ) {
    super(message, options);
  }
}

export class SkipToastError extends FetchError {
  readonly name: string = 'SkipToastError';

  constructor(
    message: string,
    public status: number,
    public context?: string,
    options?: { sendChatError?: boolean },
  ) {
    super(message, status, context, options);
  }
}

export class DeployError extends AppError {
  readonly name: string = 'DeployError';

  constructor(message: string, options?: { sendChatError?: boolean }) {
    super(message, options);
  }
}

/**
 * Error thrown when LLM repeats a previous response (tool-input-start detected)
 */
export class LLMRepeatResponseError extends AppError {
  readonly name: string = 'LLMRepeatResponseError';

  constructor(message: string = 'llm-repeat-response', options?: { sendChatError?: boolean }) {
    super(message, options);
  }
}

export class StatusCodeError extends AppError {
  readonly name: string = 'StatusCodeError';

  constructor(
    message: string = 'Status code error',
    public status: number,
    options?: { sendChatError?: boolean },
  ) {
    super(message, options);
  }
}

export class MachineAPIError extends StatusCodeError {
  readonly name: string = 'MachineAPIError';

  constructor(
    message: string = 'Machine API error',
    public status: number,
    options?: { sendChatError?: boolean },
  ) {
    super(message, status, options);
  }
}

/**
 * Helper function to check if an error is an abort/cancel error
 * Supports: DOMException (fetch), CanceledError (axios)
 */
export function isAbortError(error: unknown): boolean {
  // fetch API: DOMException with name 'AbortError'
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  // axios: CanceledError
  if (axios.isCancel(error)) {
    return true;
  }

  return false;
}

export class NoneError extends AppError {
  readonly name: string = 'NoneError';

  constructor(message: string = 'None error', options?: { sendChatError?: boolean }) {
    super(message, options);
  }
}

/**
 * Helper function to check if an error is an API key related error
 */
export function isApiKeyError(error: unknown): boolean {
  return error instanceof Error && error.message?.includes('API key');
}

/**
 * Helper function to extract HTTP status code from various error types
 * Supports: FetchError, Response, and any object with a status property
 */
export function getErrorStatus(error: unknown): number | null {
  // Check for Response instance
  if (error instanceof Response) {
    return error.status;
  }

  // Check for any object with a status property (includes FetchError, ChatTransportError, etc.)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;

    if (typeof status === 'number') {
      return status;
    }
  }

  return null;
}

/**
 * Checks if the error is a network connectivity issue (offline, DNS failure, connection interrupted, etc.).
 * Does not include HTTP errors (404, 500).
 */
export function isNetworkError(error: unknown): boolean {
  // 1. Return false if not an Error object
  if (!(error instanceof Error)) {
    return false;
  }

  // 2. Network errors from fetch are typically TypeError
  if (error.name !== 'TypeError') {
    return false;
  }

  // 3. Check message patterns (considering browser compatibility)
  const message = error.message.toLowerCase();

  return (
    message === 'network error' || // Chrome (SSE interruption, etc.)
    message === 'failed to fetch' || // Chrome (general fetch failure)
    message.includes('networkrequest') || // Some Safari versions
    message.includes('network error') // Firefox, etc.
  );
}
