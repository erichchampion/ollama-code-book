export class DIContainer {
  async resolve<T>(key: string): Promise<T> {
    if (!this.services.has(key)) {
      const available = Array.from(this.services.keys()).join(', ');
      throw new Error(
        `Service '${key}' is not registered. ` +
        `Available services: ${available}`
      );
    }
    // ...
  }
}