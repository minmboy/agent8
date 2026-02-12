/**
 * Sentry utility functions for breadcrumbs and custom spans.
 *
 * Usage:
 *   import { sentryCrumb, sentrySpan } from '~/lib/sentry';
 *
 *   // Add a breadcrumb
 *   sentryCrumb('chat', 'User sent message', { model: 'gpt-4' });
 *
 *   // Wrap an async operation with a performance span
 *   const result = await sentrySpan('llm.stream', 'http.client', async () => {
 *     return await streamText(...);
 *   }, { model, provider });
 */
import * as Sentry from '@sentry/remix';

type BreadcrumbCategory = 'chat' | 'workbench' | 'container' | 'publish' | 'file' | 'auth' | 'navigation';
type SeverityLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

/**
 * Add a Sentry breadcrumb to track user actions and system events.
 * Breadcrumbs are attached to the next error event for context.
 */
export function sentryCrumb(
  category: BreadcrumbCategory,
  message: string,
  data?: Record<string, unknown>,
  level: SeverityLevel = 'info',
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Wrap an async operation with a Sentry performance span.
 * Measures execution time and captures errors.
 */
export async function sentrySpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  return Sentry.startSpan({ name, op, attributes }, async () => {
    return await fn();
  });
}

/**
 * Set a tag on the current Sentry scope.
 * Tags are searchable and indexable in Sentry.
 */
export function sentryTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}
