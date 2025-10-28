/**
 * Object pool to reduce allocations
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();

  constructor(
    private factory: () => T,
    private reset: (obj: T) => void,
    private initialSize: number = 10
  ) {
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  /**
   * Acquire object from pool
   */
  acquire(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else {
      // Pool exhausted - create new object
      obj = this.factory();
    }

    this.inUse.add(obj);

    return obj;
  }

  /**
   * Release object back to pool
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      throw new Error('Object not in use');
    }

    this.inUse.delete(obj);

    // Reset object state
    this.reset(obj);

    this.available.push(obj);
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    available: number;
    inUse: number;
    total: number;
  } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

/**
 * Example: Pool for message objects
 */
const messagePool = new ObjectPool<Message>(
  () => ({
    id: '',
    role: MessageRole.USER,
    content: '',
    timestamp: new Date(),
    metadata: {}
  }),
  (msg) => {
    msg.id = '';
    msg.role = MessageRole.USER;
    msg.content = '';
    msg.timestamp = new Date();
    msg.metadata = {};
  },
  100 // Pre-allocate 100 messages
);