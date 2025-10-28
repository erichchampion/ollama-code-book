/**
 * Terminal output formatter
 */
export class TerminalFormatter {
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
  };

  /**
   * Format text with color
   */
  color(text: string, color: keyof typeof this.colors): string {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  /**
   * Format success message
   */
  success(message: string): string {
    return `${this.colors.green}✓${this.colors.reset} ${message}`;
  }

  /**
   * Format error message
   */
  error(message: string): string {
    return `${this.colors.red}✗${this.colors.reset} ${message}`;
  }

  /**
   * Format warning message
   */
  warning(message: string): string {
    return `${this.colors.yellow}⚠${this.colors.reset} ${message}`;
  }

  /**
   * Format info message
   */
  info(message: string): string {
    return `${this.colors.blue}ℹ${this.colors.reset} ${message}`;
  }

  /**
   * Format section header
   */
  header(text: string): string {
    return `\n${this.colors.bright}${text}${this.colors.reset}\n${'─'.repeat(text.length)}`;
  }

  /**
   * Format code block
   */
  code(text: string, language?: string): string {
    const lines = text.split('\n');
    const formatted = lines.map(line =>
      `${this.colors.gray}│${this.colors.reset} ${line}`
    ).join('\n');

    const lang = language ? ` ${language}` : '';
    return `${this.colors.gray}┌─${lang}\n${formatted}\n└─${this.colors.reset}`;
  }

  /**
   * Format list item
   */
  listItem(text: string, level: number = 0): string {
    const indent = '  '.repeat(level);
    return `${indent}${this.colors.cyan}•${this.colors.reset} ${text}`;
  }

  /**
   * Spinner frames
   */
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;

  /**
   * Get next spinner frame
   */
  spinner(): string {
    const frame = this.spinnerFrames[this.spinnerIndex];
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
    return `${this.colors.cyan}${frame}${this.colors.reset}`;
  }

  /**
   * Clear current line
   */
  clearLine(): void {
    process.stdout.write('\r\x1b[K');
  }

  /**
   * Move cursor up
   */
  cursorUp(lines: number = 1): void {
    process.stdout.write(`\x1b[${lines}A`);
  }

  /**
   * Move cursor down
   */
  cursorDown(lines: number = 1): void {
    process.stdout.write(`\x1b[${lines}B`);
  }
}