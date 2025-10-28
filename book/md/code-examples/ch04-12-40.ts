/**
 * Error categories for tool execution
 */
export enum ToolErrorCategory {
  // Validation errors (bad input)
  VALIDATION = 'VALIDATION',

  // Permission errors (access denied)
  PERMISSION = 'PERMISSION',

  // Not found errors (file/resource missing)
  NOT_FOUND = 'NOT_FOUND',

  // Timeout errors
  TIMEOUT = 'TIMEOUT',

  // Network errors (external APIs)
  NETWORK = 'NETWORK',

  // System errors (out of memory, etc.)
  SYSTEM = 'SYSTEM',

  // Unknown errors
  UNKNOWN = 'UNKNOWN'
}

/**
 * Categorize error by analyzing error object
 */
export function categorizeError(error: any): ToolErrorCategory {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toUpperCase() || '';

  // Check error codes first
  if (code === 'ENOENT') return ToolErrorCategory.NOT_FOUND;
  if (code === 'EACCES' || code === 'EPERM') return ToolErrorCategory.PERMISSION;
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return ToolErrorCategory.TIMEOUT;
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED') return ToolErrorCategory.NETWORK;

  // Check error messages
  if (message.includes('not found')) return ToolErrorCategory.NOT_FOUND;
  if (message.includes('permission') || message.includes('access denied')) {
    return ToolErrorCategory.PERMISSION;
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return ToolErrorCategory.TIMEOUT;
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return ToolErrorCategory.VALIDATION;
  }
  if (message.includes('network') || message.includes('connection')) {
    return ToolErrorCategory.NETWORK;
  }

  return ToolErrorCategory.UNKNOWN;
}