// Health status
interface HealthStatus {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: number;
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration?: number;
}

// Usage statistics
interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;

  // Breakdown
  requestsByModel: Record<string, number>;
  tokensByModel: Record<string, number>;
  costByModel: Record<string, number>;

  // Time range
  startTime: number;
  endTime: number;
}

// Model information
interface ModelInfo {
  id: string;
  name: string;
  provider: string;

  // Capabilities
  capabilities: {
    completion: boolean;
    streaming: boolean;
    tools: boolean;
    vision: boolean;
  };

  // Context
  contextWindow: number;
  maxOutputTokens: number;

  // Pricing
  pricing?: {
    input: number;            // Per 1M tokens
    output: number;           // Per 1M tokens
  };
}

// Validation result
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
}

// Conversation info
interface ConversationInfo {
  id: string;
  title?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  preview?: string;
}