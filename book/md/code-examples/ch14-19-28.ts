// src/utils/requestDedup.ts
export class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If request is already pending, return existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Start new request
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}