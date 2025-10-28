// AI generates JSDoc from implementation:
/**
 * Fetches user data from the API with retry logic
 *
 * @param userId - The unique identifier for the user
 * @param options - Configuration options for the request
 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param options.timeout - Request timeout in milliseconds (default: 5000)
 * @returns Promise resolving to user data
 * @throws {NetworkError} If network request fails after retries
 * @throws {ValidationError} If userId is invalid
 *
 * @example
 * ```typescript
 * const user = await fetchUserWithRetry('user-123', { maxRetries: 5 });
 * console.log(user.name);
 * ```
 */
async function fetchUserWithRetry(
  userId: string,
  options: { maxRetries?: number; timeout?: number } = {}
): Promise<User> {
  // Implementation...
}