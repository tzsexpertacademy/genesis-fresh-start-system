// Simple state manager for caching
class StateManager {
  private cache: Record<string, { value: any; timestamp: number }> = {};
  private ttl: number = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any) {
    this.cache[key] = {
      value,
      timestamp: Date.now()
    };
  }

  get(key: string) {
    const entry = this.cache[key];
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      delete this.cache[key];
      return null;
    }

    return entry.value;
  }

  clear() {
    this.cache = {};
  }

  cleanupOldEntries() {
    Object.keys(this.cache).forEach(key => {
      const entry = this.cache[key];
      if (Date.now() - entry.timestamp > this.ttl) {
        delete this.cache[key];
      }
    });
  }
}

export const stateManager = new StateManager();