/**
 * Registry of all routable commands
 */
export class CommandRegistry {
  private commands: Map<string, CommandRegistration> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a command
   */
  register(registration: CommandRegistration): void {
    this.commands.set(registration.className, registration);
    this.logger.debug(`Registered command: ${registration.className}`);
  }

  /**
   * Get command by class name (lazy load)
   */
  async get(className: string): Promise<RoutableCommand | null> {
    const registration = this.commands.get(className);

    if (!registration) {
      this.logger.warn(`Command not found: ${className}`);
      return null;
    }

    // Lazy load if not yet loaded
    if (!registration.instance) {
      this.logger.debug(`Lazy loading command: ${className}`);

      try {
        const CommandClass = await registration.loader();
        registration.instance = new CommandClass(registration.dependencies);
      } catch (error) {
        this.logger.error(`Failed to load command ${className}:`, error);
        return null;
      }
    }

    return registration.instance;
  }

  /**
   * Get all registered command names
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Check if command exists
   */
  has(className: string): boolean {
    return this.commands.has(className);
  }
}

export interface CommandRegistration {
  /** Command class name */
  className: string;

  /** Lazy loader function */
  loader: () => Promise<new (deps: any) => RoutableCommand>;

  /** Dependencies to inject */
  dependencies: any;

  /** Cached instance (lazy loaded) */
  instance?: RoutableCommand;
}