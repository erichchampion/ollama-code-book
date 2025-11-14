/**
 * Safe JSON Utilities - Consolidated (Task 13: 30+ duplicates)
 */
export function prettyStringify(
  obj: any,
  indentOrOptions?: number | string | { maxDepth?: number; indent?: number | string }
): string {
  const seen = new WeakSet();
  let depth = 0;
  let maxDepth = 100;
  let indent: number | string = 2;

  // Handle options object or simple indent
  if (typeof indentOrOptions === 'object' && indentOrOptions !== null) {
    maxDepth = indentOrOptions.maxDepth ?? 100;
    indent = indentOrOptions.indent ?? 2;
  } else if (indentOrOptions !== undefined) {
    indent = indentOrOptions;
  }

  return JSON.stringify(obj, (key, value) => {
    // Handle depth limiting
    if (depth > maxDepth) {
      return '[Max Depth Exceeded]';
    }

    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      depth++;
    }
    if (typeof value === 'bigint') return value.toString() + 'n';
    return value;
  }, indent);
}

// Alias for backward compatibility
export const safeStringify = prettyStringify;

export function safeParse<T = any>(json: string, fallback?: T): T | null {
  try { return JSON.parse(json); } catch { return fallback !== undefined ? fallback : null; }
}

export function isValidJSON(json: string): boolean {
  try { JSON.parse(json); return true; } catch { return false; }
}
