// src/terminal/index.ts
export interface TerminalInterface {
  // Output methods
  write(text: string): void;
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;

  // Input methods
  prompt(message: string, options?: PromptOptions): Promise<string>;
  confirm(message: string): Promise<boolean>;
  select<T>(message: string, choices: Choice<T>[]): Promise<T>;

  // Progress indicators
  startSpinner(message: string): SpinnerInstance;
  updateProgressBar(id: string, progress: number): void;
}