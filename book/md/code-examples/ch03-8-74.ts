/**
 * Manages AI provider conversations
 *
 * @param router - Intelligent router for provider selection
 * @param logger - Application logger
 * @param config - Application configuration
 */
export class ConversationManager {
  constructor(
    private router: IntelligentRouter,
    private logger: Logger,
    private config: Config
  ) {}
}