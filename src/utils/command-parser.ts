/**
 * Command Input Parser
 *
 * Provides utilities for parsing command-line input, handling quoted strings
 * and argument separation properly.
 */

/**
 * Parse command input string, respecting quoted arguments
 *
 * @param input - Raw command input string
 * @returns Array of parsed arguments
 *
 * @example
 * parseCommandInput('ask "How do I implement a binary search?"')
 * // Returns: ['ask', 'How do I implement a binary search?']
 *
 * parseCommandInput("generate 'a REST API' --output server.js")
 * // Returns: ['generate', 'a REST API', '--output', 'server.js']
 */
export function parseCommandInput(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (!inQuotes && (char === '"' || char === "'")) {
      // Start of quoted string
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      // End of quoted string
      inQuotes = false;
      quoteChar = '';
    } else if (inQuotes) {
      // Inside quoted string - add character as-is
      current += char;
    } else if (char === ' ' || char === '\t') {
      // Whitespace outside quotes - end current argument
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      // Regular character outside quotes
      current += char;
    }
  }

  // Add final argument if any
  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

/**
 * Escape a string for safe command-line usage
 *
 * @param input - String to escape
 * @returns Escaped string with quotes if needed
 */
export function escapeCommandArgument(input: string): string {
  // If string contains spaces or special characters, wrap in quotes
  if (/[\s"'\\]/.test(input)) {
    // Escape existing quotes and wrap in double quotes
    return `"${input.replace(/"/g, '\\"')}"`;
  }
  return input;
}

/**
 * Join command arguments back into a command string
 *
 * @param args - Array of command arguments
 * @returns Properly escaped command string
 */
export function joinCommandArguments(args: string[]): string {
  return args.map(escapeCommandArgument).join(' ');
}