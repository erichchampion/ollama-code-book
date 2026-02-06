/**
 * Interactive session lifecycle types.
 * Separates "conversation turn complete" from "session terminate".
 */

/** Session state for interactive mode: ready for input, processing, or ended. */
export type SessionState = 'ready' | 'processing' | 'ended';

/**
 * Result of one conversation turn from the streaming orchestrator.
 * - turnComplete: true  → turn finished; show prompt again (session continues).
 * - turnComplete: false with sessionShouldEnd: true → session should end (e.g. consecutive failures, max turns).
 */
export type TurnResult =
  | { turnComplete: true }
  | { turnComplete: false; sessionShouldEnd: true; reason?: string };
