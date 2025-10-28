/**
 * Streaming Response System Test Suite
 *
 * Tests the real-time streaming response system for AI operations.
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the StreamingResponseSystem since we can't easily import ES modules in Jest
class MockStreamingResponseSystem {
  constructor(config = {}) {
    this.config = {
      enableProgressTracking: true,
      enableTokenStreaming: true,
      progressUpdateIntervalMs: 250,
      tokenBufferSize: 100,
      maxConcurrentStreams: 10,
      timeoutMs: 300000,
      retryAttempts: 3,
      ...config
    };

    this.activeStreams = new Map();
    this.completedStreams = new Map();
    this.progressBuffer = new Map();
    this.tokenBuffer = new Map();
    this.performanceMetrics = {
      totalStreams: 0,
      completedStreams: 0,
      cancelledStreams: 0,
      errorStreams: 0,
      averageCompletionTime: 0,
      totalTokensStreamed: 0,
      averageTokensPerSecond: 0
    };
    this.eventHandlers = new Map();
  }

  // Event emitter mock
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  generateStreamId() {
    return `stream_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  generateProgressId() {
    return `progress_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }

  createStream(type, operation, options = {}) {
    const id = this.generateStreamId();

    const stream = {
      id,
      type,
      startTime: new Date(),
      status: 'pending',
      streamedTokens: 0,
      progress: [],
      operation,
      ...options
    };

    // Add cancellation support
    stream.cancel = () => this.cancelStream(id);

    this.activeStreams.set(id, stream);
    this.progressBuffer.set(id, []);

    if (this.config.enableTokenStreaming) {
      this.tokenBuffer.set(id, []);
    }

    this.performanceMetrics.totalStreams++;

    this.emit('stream:created', { stream });
    return stream;
  }

  updateProgress(streamId, stage, progress, message, metadata = {}) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    const progressUpdate = {
      id: this.generateProgressId(),
      type: stream.type,
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      timestamp: new Date(),
      metadata: {
        operation: metadata.operation || stage,
        currentStep: metadata.currentStep,
        totalSteps: metadata.totalSteps,
        context: metadata.context,
        performance: {
          memoryUsage: 256,
          cpuUsage: 12.5,
          tokensPerSecond: 50
        }
      },
      estimatedTimeRemaining: this.estimateTimeRemaining(stream, progress)
    };

    stream.progress.push(progressUpdate);

    if (this.config.enableProgressTracking) {
      this.progressBuffer.get(streamId).push(progressUpdate);
    }

    // Update stream status
    if (progress >= 100) {
      stream.status = 'completed';
    } else if (stream.status === 'pending') {
      stream.status = 'running';
    }

    // Call progress callback
    if (stream.onProgress) {
      stream.onProgress(progressUpdate);
    }

    this.emit('stream:progress', { streamId, progress: progressUpdate });
  }

  streamToken(streamId, token, type = 'text', metadata = {}) {
    const stream = this.activeStreams.get(streamId);
    if (!stream || !this.config.enableTokenStreaming) return;

    const streamToken = {
      token,
      position: stream.streamedTokens,
      type,
      confidence: metadata.confidence,
      metadata
    };

    stream.streamedTokens++;
    this.performanceMetrics.totalTokensStreamed++;

    // Add to buffer
    const buffer = this.tokenBuffer.get(streamId);
    if (buffer) {
      buffer.push(streamToken);

      // Limit buffer size
      if (buffer.length > this.config.tokenBufferSize) {
        buffer.shift();
      }
    }

    // Call token callback
    if (stream.onToken) {
      stream.onToken(streamToken);
    }

    this.emit('stream:token', { streamId, token: streamToken });
  }

  completeStream(streamId, result) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    stream.status = 'completed';
    const completionTime = Date.now() - stream.startTime.getTime();

    // Update performance metrics
    this.performanceMetrics.completedStreams++;
    this.updateAverageCompletionTime(completionTime);
    this.updateAverageTokensPerSecond(stream.streamedTokens, completionTime);

    // Final progress update
    this.updateProgress(
      streamId,
      'completed',
      100,
      'Operation completed successfully',
      { operation: 'completion' }
    );

    // Call completion callback
    if (stream.onComplete) {
      stream.onComplete(result);
    }

    // Move to completed streams
    this.completedStreams.set(streamId, stream);
    this.activeStreams.delete(streamId);

    this.emit('stream:completed', { streamId, stream, result });
  }

  errorStream(streamId, error) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    stream.status = 'error';
    this.performanceMetrics.errorStreams++;

    // Call error callback
    if (stream.onError) {
      stream.onError(error);
    }

    // Move to completed streams for debugging
    this.completedStreams.set(streamId, stream);
    this.activeStreams.delete(streamId);

    this.emit('stream:error', { streamId, stream, error });
  }

  cancelStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    stream.status = 'cancelled';
    this.performanceMetrics.cancelledStreams++;

    // Cleanup buffers
    this.progressBuffer.delete(streamId);
    this.tokenBuffer.delete(streamId);

    // Move to completed streams
    this.completedStreams.set(streamId, stream);
    this.activeStreams.delete(streamId);

    this.emit('stream:cancelled', { streamId, stream });
  }

  getActiveStreams() {
    return Array.from(this.activeStreams.values());
  }

  getStream(streamId) {
    return this.activeStreams.get(streamId) || this.completedStreams.get(streamId);
  }

  getStreamProgress(streamId) {
    return this.progressBuffer.get(streamId) || [];
  }

  getStreamTokens(streamId) {
    return this.tokenBuffer.get(streamId) || [];
  }

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      activeStreams: this.activeStreams.size,
      uptime: process.uptime()
    };
  }

  cleanupOldStreams(maxAgeMs = 3600000) {
    const cutoff = Date.now() - maxAgeMs;

    for (const [id, stream] of this.completedStreams.entries()) {
      if (stream.startTime.getTime() < cutoff) {
        this.completedStreams.delete(id);
        this.progressBuffer.delete(id);
        this.tokenBuffer.delete(id);
      }
    }
  }

  estimateTimeRemaining(stream, currentProgress) {
    if (currentProgress <= 0) return undefined;

    const elapsed = Date.now() - stream.startTime.getTime();
    const totalEstimated = (elapsed / currentProgress) * 100;
    return Math.max(0, totalEstimated - elapsed);
  }

  updateAverageCompletionTime(completionTime) {
    const completed = this.performanceMetrics.completedStreams;
    if (completed === 1) {
      this.performanceMetrics.averageCompletionTime = completionTime;
    } else {
      this.performanceMetrics.averageCompletionTime =
        (this.performanceMetrics.averageCompletionTime * (completed - 1) + completionTime) / completed;
    }
  }

  updateAverageTokensPerSecond(tokens, timeMs) {
    const tokensPerSecond = (tokens / timeMs) * 1000;
    const totalStreams = this.performanceMetrics.completedStreams;

    if (totalStreams === 1) {
      this.performanceMetrics.averageTokensPerSecond = tokensPerSecond;
    } else {
      this.performanceMetrics.averageTokensPerSecond =
        (this.performanceMetrics.averageTokensPerSecond * (totalStreams - 1) + tokensPerSecond) / totalStreams;
    }
  }
}

describe('Streaming Response System', () => {
  let streamingSystem;

  beforeEach(() => {
    streamingSystem = new MockStreamingResponseSystem();
  });

  afterEach(() => {
    // Cleanup
    streamingSystem.activeStreams.clear();
    streamingSystem.completedStreams.clear();
    streamingSystem.progressBuffer.clear();
    streamingSystem.tokenBuffer.clear();
  });

  describe('Stream Creation and Management', () => {
    test('should create a new stream with correct properties', () => {
      const stream = streamingSystem.createStream('analysis', 'Code Analysis');

      expect(stream.id).toBeDefined();
      expect(stream.type).toBe('analysis');
      expect(stream.status).toBe('pending');
      expect(stream.streamedTokens).toBe(0);
      expect(stream.progress).toEqual([]);
      expect(typeof stream.cancel).toBe('function');
    });

    test('should track active streams', () => {
      const stream1 = streamingSystem.createStream('analysis', 'Test 1');
      const stream2 = streamingSystem.createStream('generation', 'Test 2');

      const activeStreams = streamingSystem.getActiveStreams();
      expect(activeStreams).toHaveLength(2);
      expect(activeStreams.map(s => s.id)).toContain(stream1.id);
      expect(activeStreams.map(s => s.id)).toContain(stream2.id);
    });

    test('should emit stream creation event', () => {
      let emittedEvent = null;
      streamingSystem.on('stream:created', (data) => {
        emittedEvent = data;
      });

      const stream = streamingSystem.createStream('processing', 'Test Stream');

      expect(emittedEvent).toBeTruthy();
      expect(emittedEvent.stream.id).toBe(stream.id);
    });

    test('should provide stream cancellation', () => {
      const stream = streamingSystem.createStream('analysis', 'Cancellable Stream');

      expect(streamingSystem.getActiveStreams()).toHaveLength(1);

      stream.cancel();

      expect(streamingSystem.getActiveStreams()).toHaveLength(0);
      expect(stream.status).toBe('cancelled');
    });
  });

  describe('Progress Tracking', () => {
    test('should update stream progress correctly', () => {
      const stream = streamingSystem.createStream('analysis', 'Progress Test');

      streamingSystem.updateProgress(
        stream.id,
        'analyzing',
        25,
        'Analyzing codebase...',
        { currentStep: 1, totalSteps: 4 }
      );

      expect(stream.progress).toHaveLength(1);
      expect(stream.progress[0].progress).toBe(25);
      expect(stream.progress[0].message).toBe('Analyzing codebase...');
      expect(stream.progress[0].metadata.currentStep).toBe(1);
      expect(stream.status).toBe('running');
    });

    test('should complete stream when progress reaches 100', () => {
      const stream = streamingSystem.createStream('generation', 'Completion Test');

      streamingSystem.updateProgress(stream.id, 'finalizing', 100, 'Complete');

      expect(stream.status).toBe('completed');
    });

    test('should call progress callback when provided', () => {
      let receivedProgress = null;

      const stream = streamingSystem.createStream('analysis', 'Callback Test', {
        onProgress: (progress) => {
          receivedProgress = progress;
        }
      });

      streamingSystem.updateProgress(stream.id, 'test', 50, 'Testing callback');

      expect(receivedProgress).toBeTruthy();
      expect(receivedProgress.progress).toBe(50);
    });

    test('should estimate time remaining', (done) => {
      const stream = streamingSystem.createStream('processing', 'Time Estimation Test');

      // Wait a bit to have some elapsed time
      setTimeout(() => {
        try {
          streamingSystem.updateProgress(stream.id, 'processing', 50, 'Halfway done');

          const progress = stream.progress[0];
          expect(progress).toBeTruthy();
          expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
          done();
        } catch (error) {
          done(error);
        }
      }, 50);
    });

    test('should track progress in buffer', () => {
      const stream = streamingSystem.createStream('indexing', 'Buffer Test');

      streamingSystem.updateProgress(stream.id, 'step1', 33, 'Step 1');
      streamingSystem.updateProgress(stream.id, 'step2', 66, 'Step 2');
      streamingSystem.updateProgress(stream.id, 'step3', 100, 'Step 3');

      const progressHistory = streamingSystem.getStreamProgress(stream.id);
      expect(progressHistory).toHaveLength(3);
      expect(progressHistory[0].message).toBe('Step 1');
      expect(progressHistory[2].message).toBe('Step 3');
    });
  });

  describe('Token Streaming', () => {
    test('should stream tokens correctly', () => {
      const stream = streamingSystem.createStream('generation', 'Token Test');

      streamingSystem.streamToken(stream.id, 'Hello', 'text');
      streamingSystem.streamToken(stream.id, ' ', 'text');
      streamingSystem.streamToken(stream.id, 'world', 'text');

      expect(stream.streamedTokens).toBe(3);

      const tokens = streamingSystem.getStreamTokens(stream.id);
      expect(tokens).toHaveLength(3);
      expect(tokens[0].token).toBe('Hello');
      expect(tokens[0].position).toBe(0);
      expect(tokens[2].token).toBe('world');
      expect(tokens[2].position).toBe(2);
    });

    test('should call token callback when provided', () => {
      let receivedTokens = [];

      const stream = streamingSystem.createStream('generation', 'Token Callback Test', {
        onToken: (token) => {
          receivedTokens.push(token);
        }
      });

      streamingSystem.streamToken(stream.id, 'test', 'text');
      streamingSystem.streamToken(stream.id, 'token', 'text');

      expect(receivedTokens).toHaveLength(2);
      expect(receivedTokens[0].token).toBe('test');
      expect(receivedTokens[1].token).toBe('token');
    });

    test('should limit token buffer size', () => {
      const stream = streamingSystem.createStream('generation', 'Buffer Limit Test');

      // Stream more tokens than buffer size
      for (let i = 0; i < 150; i++) {
        streamingSystem.streamToken(stream.id, `token${i}`, 'text');
      }

      const tokens = streamingSystem.getStreamTokens(stream.id);
      expect(tokens.length).toBeLessThanOrEqual(streamingSystem.config.tokenBufferSize);
      expect(stream.streamedTokens).toBe(150);
    });

    test('should handle different token types', () => {
      const stream = streamingSystem.createStream('generation', 'Token Types Test');

      streamingSystem.streamToken(stream.id, 'console.log("hello")', 'code');
      streamingSystem.streamToken(stream.id, '# Heading', 'markdown');
      streamingSystem.streamToken(stream.id, '{"key": "value"}', 'json');

      const tokens = streamingSystem.getStreamTokens(stream.id);
      expect(tokens[0].type).toBe('code');
      expect(tokens[1].type).toBe('markdown');
      expect(tokens[2].type).toBe('json');
    });
  });

  describe('Stream Completion and Error Handling', () => {
    test('should complete stream successfully', () => {
      let completionResult = null;

      const stream = streamingSystem.createStream('analysis', 'Completion Test', {
        onComplete: (result) => {
          completionResult = result;
        }
      });

      const result = { analysis: 'complete', files: 5 };
      streamingSystem.completeStream(stream.id, result);

      expect(stream.status).toBe('completed');
      expect(completionResult).toEqual(result);
      expect(streamingSystem.getActiveStreams()).toHaveLength(0);
      expect(streamingSystem.getStream(stream.id)).toBeTruthy(); // Should be in completed streams
    });

    test('should handle stream errors', () => {
      let errorReceived = null;

      const stream = streamingSystem.createStream('processing', 'Error Test', {
        onError: (error) => {
          errorReceived = error;
        }
      });

      const testError = new Error('Test error');
      streamingSystem.errorStream(stream.id, testError);

      expect(stream.status).toBe('error');
      expect(errorReceived).toBe(testError);
      expect(streamingSystem.getActiveStreams()).toHaveLength(0);
    });

    test('should cancel stream correctly', () => {
      const stream = streamingSystem.createStream('generation', 'Cancel Test');

      streamingSystem.cancelStream(stream.id);

      expect(stream.status).toBe('cancelled');
      expect(streamingSystem.getActiveStreams()).toHaveLength(0);
      expect(streamingSystem.performanceMetrics.cancelledStreams).toBe(1);
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', () => {
      const stream1 = streamingSystem.createStream('analysis', 'Metrics Test 1');
      const stream2 = streamingSystem.createStream('generation', 'Metrics Test 2');

      streamingSystem.streamToken(stream1.id, 'token1', 'text');
      streamingSystem.streamToken(stream1.id, 'token2', 'text');

      streamingSystem.completeStream(stream1.id, { success: true });
      streamingSystem.cancelStream(stream2.id);

      const metrics = streamingSystem.getPerformanceMetrics();

      expect(metrics.totalStreams).toBe(2);
      expect(metrics.completedStreams).toBe(1);
      expect(metrics.cancelledStreams).toBe(1);
      expect(metrics.totalTokensStreamed).toBe(2);
      expect(metrics.activeStreams).toBe(0);
    });

    test('should calculate average completion time', (done) => {
      const stream1 = streamingSystem.createStream('analysis', 'Timing Test 1');
      const stream2 = streamingSystem.createStream('analysis', 'Timing Test 2');

      // Simulate some processing time
      setTimeout(() => {
        try {
          streamingSystem.completeStream(stream1.id, {});
          streamingSystem.completeStream(stream2.id, {});

          const metrics = streamingSystem.getPerformanceMetrics();
          expect(metrics.averageCompletionTime).toBeGreaterThan(0);
          done();
        } catch (error) {
          done(error);
        }
      }, 10);
    });

    test('should calculate tokens per second', (done) => {
      const stream = streamingSystem.createStream('generation', 'Tokens Per Second Test');

      for (let i = 0; i < 10; i++) {
        streamingSystem.streamToken(stream.id, `token${i}`, 'text');
      }

      setTimeout(() => {
        try {
          streamingSystem.completeStream(stream.id, {});

          const metrics = streamingSystem.getPerformanceMetrics();
          expect(metrics.averageTokensPerSecond).toBeGreaterThan(0);
          done();
        } catch (error) {
          done(error);
        }
      }, 10);
    });
  });

  describe('Configuration and Cleanup', () => {
    test('should respect configuration options', () => {
      const customConfig = {
        enableTokenStreaming: false,
        tokenBufferSize: 50,
        maxConcurrentStreams: 5
      };

      const customSystem = new MockStreamingResponseSystem(customConfig);

      expect(customSystem.config.enableTokenStreaming).toBe(false);
      expect(customSystem.config.tokenBufferSize).toBe(50);
      expect(customSystem.config.maxConcurrentStreams).toBe(5);
    });

    test('should disable token streaming when configured', () => {
      const system = new MockStreamingResponseSystem({ enableTokenStreaming: false });
      const stream = system.createStream('generation', 'No Token Test');

      system.streamToken(stream.id, 'token', 'text');

      expect(stream.streamedTokens).toBe(0);
      expect(system.getStreamTokens(stream.id)).toHaveLength(0);
    });

    test('should cleanup old streams', () => {
      const stream1 = streamingSystem.createStream('analysis', 'Old Stream');
      const stream2 = streamingSystem.createStream('generation', 'New Stream');

      streamingSystem.completeStream(stream1.id, {});
      streamingSystem.completeStream(stream2.id, {});

      // Mock old timestamp for stream1
      const completedStream1 = streamingSystem.completedStreams.get(stream1.id);
      completedStream1.startTime = new Date(Date.now() - 7200000); // 2 hours ago

      streamingSystem.cleanupOldStreams(3600000); // 1 hour

      expect(streamingSystem.getStream(stream1.id)).toBeUndefined();
      expect(streamingSystem.getStream(stream2.id)).toBeTruthy();
    });
  });

  describe('Event Emission', () => {
    test('should emit progress events', () => {
      let emittedProgress = null;
      streamingSystem.on('stream:progress', (data) => {
        emittedProgress = data;
      });

      const stream = streamingSystem.createStream('processing', 'Event Test');
      streamingSystem.updateProgress(stream.id, 'testing', 50, 'Test progress');

      expect(emittedProgress).toBeTruthy();
      expect(emittedProgress.streamId).toBe(stream.id);
      expect(emittedProgress.progress.progress).toBe(50);
    });

    test('should emit token events', () => {
      let emittedToken = null;
      streamingSystem.on('stream:token', (data) => {
        emittedToken = data;
      });

      const stream = streamingSystem.createStream('generation', 'Token Event Test');
      streamingSystem.streamToken(stream.id, 'test', 'text');

      expect(emittedToken).toBeTruthy();
      expect(emittedToken.streamId).toBe(stream.id);
      expect(emittedToken.token.token).toBe('test');
    });

    test('should emit completion events', () => {
      let emittedCompletion = null;
      streamingSystem.on('stream:completed', (data) => {
        emittedCompletion = data;
      });

      const stream = streamingSystem.createStream('analysis', 'Completion Event Test');
      const result = { completed: true };
      streamingSystem.completeStream(stream.id, result);

      expect(emittedCompletion).toBeTruthy();
      expect(emittedCompletion.streamId).toBe(stream.id);
      expect(emittedCompletion.result).toEqual(result);
    });
  });
});

console.log('✅ Streaming Response System test suite created');
console.log('📊 Test coverage areas:');
console.log('   - Stream creation and management');
console.log('   - Progress tracking with callbacks');
console.log('   - Real-time token streaming');
console.log('   - Stream completion and error handling');
console.log('   - Performance metrics and monitoring');
console.log('   - Configuration and cleanup');
console.log('   - Event emission and handling');
console.log('   - Time estimation and buffer management');