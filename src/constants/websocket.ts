/**
 * WebSocket Constants
 *
 * Standard WebSocket close codes and IDE-specific constants
 */

/**
 * Standard WebSocket Close Codes
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
export const WS_CLOSE_CODES = {
  /** Normal closure */
  NORMAL: 1000,

  /** Going away (e.g., server going down or browser navigating away) */
  GOING_AWAY: 1001,

  /** Protocol error */
  PROTOCOL_ERROR: 1002,

  /** Unsupported data type */
  UNSUPPORTED_DATA: 1003,

  /** No status received */
  NO_STATUS_RECEIVED: 1005,

  /** Abnormal closure */
  ABNORMAL_CLOSURE: 1006,

  /** Invalid frame payload data */
  INVALID_FRAME_PAYLOAD: 1007,

  /** Policy violation */
  POLICY_VIOLATION: 1008,

  /** Message too big */
  MESSAGE_TOO_BIG: 1009,

  /** Mandatory extension missing */
  MISSING_EXTENSION: 1010,

  /** Internal server error */
  INTERNAL_ERROR: 1011,

  /** Service restart */
  SERVICE_RESTART: 1012,

  /** Try again later */
  TRY_AGAIN_LATER: 1013,

  /** Bad gateway */
  BAD_GATEWAY: 1014,

  /** TLS handshake failure */
  TLS_HANDSHAKE: 1015
} as const;

/**
 * IDE-specific close reasons
 */
export const IDE_CLOSE_REASONS = {
  SERVER_SHUTDOWN: 'Server shutdown',
  CLIENT_TIMEOUT: 'Client timeout',
  STARTUP_FAILED: 'Server startup failed',
  EXTENSION_DISCONNECTING: 'Extension disconnecting',
  AUTHENTICATION_FAILED: 'Authentication failed',
  PROTOCOL_VERSION_MISMATCH: 'Protocol version mismatch'
} as const;

/**
 * Default IDE Integration Server configuration
 */
export const IDE_SERVER_DEFAULTS = {
  /** Default port for IDE integration server */
  PORT: 3002,

  /** Default MCP server port offset */
  MCP_PORT_OFFSET: 1,

  /** Maximum concurrent client connections */
  MAX_CLIENTS: 50,

  /** Maximum message size (1MB) */
  MAX_MESSAGE_SIZE: 1024 * 1024
} as const;

/**
 * Get close code description
 */
export function getCloseCodeDescription(code: number): string {
  const descriptions: Record<number, string> = {
    [WS_CLOSE_CODES.NORMAL]: 'Normal closure',
    [WS_CLOSE_CODES.GOING_AWAY]: 'Endpoint going away',
    [WS_CLOSE_CODES.PROTOCOL_ERROR]: 'Protocol error',
    [WS_CLOSE_CODES.UNSUPPORTED_DATA]: 'Unsupported data type',
    [WS_CLOSE_CODES.ABNORMAL_CLOSURE]: 'Abnormal closure',
    [WS_CLOSE_CODES.INVALID_FRAME_PAYLOAD]: 'Invalid frame payload',
    [WS_CLOSE_CODES.POLICY_VIOLATION]: 'Policy violation',
    [WS_CLOSE_CODES.MESSAGE_TOO_BIG]: 'Message too big',
    [WS_CLOSE_CODES.MISSING_EXTENSION]: 'Missing extension',
    [WS_CLOSE_CODES.INTERNAL_ERROR]: 'Internal server error',
    [WS_CLOSE_CODES.SERVICE_RESTART]: 'Service restart',
    [WS_CLOSE_CODES.TRY_AGAIN_LATER]: 'Try again later',
    [WS_CLOSE_CODES.BAD_GATEWAY]: 'Bad gateway',
    [WS_CLOSE_CODES.TLS_HANDSHAKE]: 'TLS handshake failure'
  };

  return descriptions[code] || `Unknown close code: ${code}`;
}