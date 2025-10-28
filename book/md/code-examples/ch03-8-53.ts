// Bad: Hidden dependencies
export class ConversationManager {
  constructor(private container: DIContainer) {}

  async analyze(prompt: string) {
    // Dependencies hidden in implementation
    const router = await this.container.resolve('router');
    const logger = await this.container.resolve('logger');
    // ...
  }
}