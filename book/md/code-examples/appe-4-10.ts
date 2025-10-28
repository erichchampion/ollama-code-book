function validateCommand(command: string, args: string[]): boolean {
  // Check command is whitelisted
  if (!ALLOWED_COMMANDS.includes(command)) {
    return false;
  }

  // Check args are safe
  const DANGEROUS_PATTERNS = [
    /;/,           // Command chaining
    /\|/,          // Piping
    /`/,           // Command substitution
    /\$/,          // Variable expansion
    />/,           // Redirection
    /</
  ];

  return !args.some(arg =>
    DANGEROUS_PATTERNS.some(pattern => pattern.test(arg))
  );
}