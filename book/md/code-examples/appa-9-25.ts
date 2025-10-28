class AIProviderError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public provider: string,
    public details?: any
  );
}

type AIErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_REQUEST'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'CONTENT_FILTER'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';