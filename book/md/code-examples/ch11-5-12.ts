/**
 * Lazy loads large datasets
 */
export class LazyDataset<T> {
  private data?: T[];
  private loading?: Promise<T[]>;

  constructor(
    private loader: () => Promise<T[]>,
    private pageSize: number = 100
  ) {}

  /**
   * Get page of data
   */
  async getPage(page: number): Promise<T[]> {
    const allData = await this.getAll();

    const start = page * this.pageSize;
    const end = start + this.pageSize;

    return allData.slice(start, end);
  }

  /**
   * Get all data (loads if needed)
   */
  async getAll(): Promise<T[]> {
    if (this.data) {
      return this.data;
    }

    if (this.loading) {
      return this.loading;
    }

    this.loading = this.loader();
    this.data = await this.loading;
    this.loading = undefined;

    return this.data;
  }

  /**
   * Unload data to free memory
   */
  unload(): void {
    this.data = undefined;
  }
}