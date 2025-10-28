/**
 * Buffer strategy for stream processing
 */
export enum BufferStrategy {
  // No buffering - process immediately
  NONE = 'none',

  // Fixed size buffer
  FIXED = 'fixed',

  // Dynamic buffer that grows as needed
  DYNAMIC = 'dynamic',

  // Sliding window - keep only recent data
  SLIDING = 'sliding'
}

/**
 * Stream buffer for managing chunks
 */
export class StreamBuffer {
  private buffer: string[] = [];
  private maxSize: number;
  private strategy: BufferStrategy;
  private bytesBuffered = 0;
  private maxBytes: number;

  constructor(
    strategy: BufferStrategy = BufferStrategy.DYNAMIC,
    options: BufferOptions = {}
  ) {
    this.strategy = strategy;
    this.maxSize = options.maxSize || 1000;
    this.maxBytes = options.maxBytes || 1024 * 1024; // 1MB default
  }

  /**
   * Add chunk to buffer
   */
  add(chunk: string): void {
    const chunkBytes = Buffer.byteLength(chunk, 'utf8');

    // Check byte limit
    if (this.bytesBuffered + chunkBytes > this.maxBytes) {
      this.evict(chunkBytes);
    }

    this.buffer.push(chunk);
    this.bytesBuffered += chunkBytes;

    // Apply strategy
    this.applyStrategy();
  }

  /**
   * Get buffered content
   */
  get(): string {
    return this.buffer.join('');
  }

  /**
   * Get last N chunks
   */
  getLast(n: number): string {
    return this.buffer.slice(-n).join('');
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
    this.bytesBuffered = 0;
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Get bytes buffered
   */
  bytes(): number {
    return this.bytesBuffered;
  }

  /**
   * Apply buffer strategy
   */
  private applyStrategy(): void {
    switch (this.strategy) {
      case BufferStrategy.NONE:
        // Keep only last chunk
        if (this.buffer.length > 1) {
          const removed = this.buffer.shift()!;
          this.bytesBuffered -= Buffer.byteLength(removed, 'utf8');
        }
        break;

      case BufferStrategy.FIXED:
        // Keep fixed number of chunks
        while (this.buffer.length > this.maxSize) {
          const removed = this.buffer.shift()!;
          this.bytesBuffered -= Buffer.byteLength(removed, 'utf8');
        }
        break;

      case BufferStrategy.SLIDING:
        // Keep only recent chunks (half of max size)
        const target = Math.floor(this.maxSize / 2);
        while (this.buffer.length > target) {
          const removed = this.buffer.shift()!;
          this.bytesBuffered -= Buffer.byteLength(removed, 'utf8');
        }
        break;

      case BufferStrategy.DYNAMIC:
        // No limit, but respect maxBytes
        break;
    }
  }

  /**
   * Evict old chunks to make room
   */
  private evict(requiredBytes: number): void {
    while (this.bytesBuffered + requiredBytes > this.maxBytes && this.buffer.length > 0) {
      const removed = this.buffer.shift()!;
      this.bytesBuffered -= Buffer.byteLength(removed, 'utf8');
    }
  }
}

interface BufferOptions {
  maxSize?: number;
  maxBytes?: number;
}