// Good: Clear dependency hierarchy
// Layer 1 (Foundation)
Logger

// Layer 2 (Infrastructure)
ProviderManager → Logger

// Layer 3 (Core Services)
Router → ProviderManager, Logger
Fusion → Router, Logger

// Layer 4 (Application Services)
ConversationManager → Router, Logger
ToolOrchestrator → Router, Logger

// Layer 5 (Orchestration)
App → ConversationManager, ToolOrchestrator, Router, Logger

// Dependencies only flow downward (higher layers depend on lower layers)