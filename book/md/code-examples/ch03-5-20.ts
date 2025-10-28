/**
 * Interface for disposable resources
 */
export interface IDisposable {
  /**
   * Release all resources held by this object
   */
  dispose(): Promise<void> | void;
}

/**
 * Check if an object is disposable
 */
export function isDisposable(obj: any): obj is IDisposable {
  return obj && typeof obj.dispose === 'function';
}