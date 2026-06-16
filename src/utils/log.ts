/**
 * Terminal output utilities.
 *
 * Wraps `picocolors` for colored CLI messages. All user-facing output goes
 * through these functions — never use raw `console.log` in application code.
 * Centralizing here makes it easy to switch coloring libraries or suppress
 * output during tests.
 */

import pc from 'picocolors';

/** Yellow warning — non-fatal issue, user can recover. */
export function logWarning(message: string): void {
  console.log(pc.yellow(`[WARNING] ${message}`));
}

/** Red error — fatal or requires user action. Uses stderr. */
export function logError(message: string): void {
  console.error(pc.red(`[ERROR] ${message}`));
}

/** Plain output — no prefix, no color. For user-facing UI (art, summaries, etc.). */
export function logPlain(message: string): void {
  console.log(message);
}
