/**
 * Service registration options
 */
export interface ServiceOptions {
  /** If true, create singleton (default: true) */
  singleton?: boolean;

  /** Factory function to create instance */
  factory?: (container: DIContainer) => any | Promise<any>;

  /** Dependencies to inject (auto-detected if not specified) */
  dependencies?: string[];

  /** Lifecycle hooks */
  lifecycle?: {
    onInit?: (instance: any) => Promise<void> | void;
    onDispose?: (instance: any) => Promise<void> | void;
  };
}

/**
 * Service definition
 */
interface ServiceDefinition {
  key: string;
  constructor?: new (...args: any[]) => any;
  factory?: (container: DIContainer) => any | Promise<any>;
  options: ServiceOptions;
  instance?: any;
  dependencies: string[];
}

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private services = new Map<string, ServiceDefinition>();
  private resolving = new Set<string>();
  private initialized = new Set<string>();

  /**
   * Register a service
   */
  register<T>(
    key: string,
    constructor: new (...args: any[]) => T,
    options: ServiceOptions = {}
  ): void {
    // Implementation coming next
  }

  /**
   * Resolve a service (create or return cached instance)
   */
  async resolve<T>(key: string): Promise<T> {
    // Implementation coming next
  }

  /**
   * Check if service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Dispose all services
   */
  async dispose(): Promise<void> {
    // Implementation coming next
  }
}