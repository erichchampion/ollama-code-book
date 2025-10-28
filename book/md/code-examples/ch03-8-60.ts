export class ProviderManager implements IDisposable {
  async dispose(): Promise<void> {
    // Clean up resources
    await this.saveStats();
    await this.closeConnections();
  }
}