/**
 * Performance-optimized router with caching
 */
export class OptimizedNaturalLanguageRouter {
  private router: NaturalLanguageRouter;
  private loader: LazyCommandLoader;
  private intentCache: LRUCache<string, IntentMatch[]>;
  private routeCache: LRUCache<string, RoutingResult>;

  constructor(
    aiProvider: AIProvider,
    commandRegistry: CommandRegistry,
    logger: Logger
  ) {
    this.router = new NaturalLanguageRouter(aiProvider, commandRegistry, logger);
    this.loader = new LazyCommandLoader(commandRegistry, logger);

    // Cache classification results
    this.intentCache = new LRUCache({ max: 1000, ttl: 1000 * 60 * 60 }); // 1 hour

    // Cache full routing results for exact matches
    this.routeCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 30 }); // 30 min
  }

  /**
   * Route with caching
   */
  async route(
    input: string,
    context: CommandContext
  ): Promise<RoutingResult> {
    // Check full route cache for exact input match
    const cached = this.routeCache.get(input);
    if (cached) {
      return cached;
    }

    // Route normally
    const result = await this.router.route(input, context);

    // Cache successful results
    if (result.success) {
      this.routeCache.set(input, result);
    }

    return result;
  }

  /**
   * Warmup: preload common commands
   */
  async warmup(): Promise<void> {
    const commonCommands = [
      'CommitCommand',
      'ReviewCommand',
      'AnalyzeCommand',
      'TestCommand'
    ];

    await this.loader.preloadCommon(commonCommands);
  }
}