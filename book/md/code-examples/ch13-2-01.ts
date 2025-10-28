/**
 * Extension point types
 */
export enum ExtensionPointType {
  /** Add custom tools */
  TOOL = 'tool',

  /** Add custom commands */
  COMMAND = 'command',

  /** Add custom AI providers */
  PROVIDER = 'provider',

  /** Add custom middleware */
  MIDDLEWARE = 'middleware',

  /** Subscribe to events */
  EVENT_HANDLER = 'event_handler',

  /** Modify UI elements */
  UI_COMPONENT = 'ui_component'
}

/**
 * Extension point registry
 */
export class ExtensionPointRegistry {
  private points = new Map<string, ExtensionPoint<any>>();

  /**
   * Register an extension point
   */
  register<T>(point: ExtensionPoint<T>): void {
    this.points.set(point.name, point);
  }

  /**
   * Get extension point
   */
  get<T>(name: string): ExtensionPoint<T> | undefined {
    return this.points.get(name);
  }

  /**
   * List all extension points
   */
  list(): ExtensionPoint<any>[] {
    return Array.from(this.points.values());
  }
}

/**
 * Extension point for a specific type
 */
export class ExtensionPoint<T> {
  private extensions: T[] = [];

  constructor(
    public readonly name: string,
    public readonly type: ExtensionPointType,
    public readonly description: string
  ) {}

  /**
   * Register an extension
   */
  register(extension: T): void {
    this.extensions.push(extension);
  }

  /**
   * Unregister an extension
   */
  unregister(extension: T): void {
    const index = this.extensions.indexOf(extension);
    if (index !== -1) {
      this.extensions.splice(index, 1);
    }
  }

  /**
   * Get all extensions
   */
  getAll(): T[] {
    return [...this.extensions];
  }

  /**
   * Clear all extensions
   */
  clear(): void {
    this.extensions = [];
  }
}