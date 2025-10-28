/**
 * Types of events in a streaming response
 */
export enum StreamEventType {
  // Content chunk from AI
  CONTENT = 'content',

  // Tool execution started
  TOOL_START = 'tool_start',

  // Tool execution progress
  TOOL_PROGRESS = 'tool_progress',

  // Tool execution completed
  TOOL_COMPLETE = 'tool_complete',

  // Tool execution failed
  TOOL_ERROR = 'tool_error',

  // Stream completed successfully
  DONE = 'done',

  // Stream error
  ERROR = 'error',

  // Metadata (model info, usage stats, etc.)
  METADATA = 'metadata'
}

/**
 * Base stream event
 */
export interface StreamEvent {
  type: StreamEventType;
  timestamp: Date;
}

/**
 * Content event - AI generated text
 */
export interface ContentEvent extends StreamEvent {
  type: StreamEventType.CONTENT;
  content: string;
  delta?: string; // Incremental change (for efficiency)
}

/**
 * Tool start event
 */
export interface ToolStartEvent extends StreamEvent {
  type: StreamEventType.TOOL_START;
  toolName: string;
  toolId: string;
  parameters: any;
}

/**
 * Tool progress event
 */
export interface ToolProgressEvent extends StreamEvent {
  type: StreamEventType.TOOL_PROGRESS;
  toolId: string;
  progress: number; // 0-100
  message?: string;
}

/**
 * Tool complete event
 */
export interface ToolCompleteEvent extends StreamEvent {
  type: StreamEventType.TOOL_COMPLETE;
  toolId: string;
  result: any;
  durationMs: number;
}

/**
 * Tool error event
 */
export interface ToolErrorEvent extends StreamEvent {
  type: StreamEventType.TOOL_ERROR;
  toolId: string;
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Done event - stream completed
 */
export interface DoneEvent extends StreamEvent {
  type: StreamEventType.DONE;
  metadata?: {
    tokensGenerated?: number;
    durationMs?: number;
    model?: string;
  };
}

/**
 * Error event - stream failed
 */
export interface ErrorEvent extends StreamEvent {
  type: StreamEventType.ERROR;
  error: {
    message: string;
    code?: string;
    recoverable: boolean;
  };
}

/**
 * Metadata event
 */
export interface MetadataEvent extends StreamEvent {
  type: StreamEventType.METADATA;
  metadata: {
    model?: string;
    provider?: string;
    [key: string]: any;
  };
}

/**
 * Union type of all stream events
 */
export type AnyStreamEvent =
  | ContentEvent
  | ToolStartEvent
  | ToolProgressEvent
  | ToolCompleteEvent
  | ToolErrorEvent
  | DoneEvent
  | ErrorEvent
  | MetadataEvent;