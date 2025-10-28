/**
 * The three pillars of observability
 */
export enum ObservabilityPillar {
  /** Logs: Discrete events with context */
  LOGS = 'logs',

  /** Metrics: Numerical measurements over time */
  METRICS = 'metrics',

  /** Traces: Request flow through system */
  TRACES = 'traces'
}

/**
 * Observability requirements for AI systems
 */
export const OBSERVABILITY_REQUIREMENTS = {
  logs: {
    structured: true,        // Machine-parseable format
    contextual: true,        // Include request/user context
    searchable: true,        // Full-text search capability
    retention: 30,           // Days to retain
    sampling: false          // No sampling (capture all)
  },

  metrics: {
    granularity: 60,         // Seconds between measurements
    dimensions: [            // Metric dimensions
      'provider',
      'model',
      'operation',
      'status'
    ],
    aggregations: [          // Aggregation types
      'sum',
      'avg',
      'p50',
      'p95',
      'p99'
    ]
  },

  traces: {
    sampleRate: 1.0,         // 100% sampling in production
    includeContext: true,    // Include full request context
    maxSpans: 1000,          // Max spans per trace
    retention: 7             // Days to retain
  }
};