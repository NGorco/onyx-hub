import { AsyncLocalStorage } from "async_hooks";

interface ContextData {
  userId: string;
  sessionToken: string;
}

class Context {
  private static storage = new AsyncLocalStorage<ContextData>();

  static async setStore(data: ContextData): Promise<void> {
    this.storage.run(data, () => {});
  }

  static async getStore(): Promise<ContextData | undefined> {
    return this.storage.getStore();
  }
}
