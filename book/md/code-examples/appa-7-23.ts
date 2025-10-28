interface IDisposable {
  dispose(): void | Promise<void>;
}

class DisposableStore {
  add(disposable: IDisposable): void;
  dispose(): Promise<void>;
}