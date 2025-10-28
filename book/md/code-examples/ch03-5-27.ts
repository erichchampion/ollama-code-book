// Good: Explicitly implements IDisposable
export class DatabaseConnection implements IDisposable {
  private connection: Connection | null = null;

  async connect(): Promise<void> {
    this.connection = await createConnection(/*...*/);
  }

  async dispose(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}