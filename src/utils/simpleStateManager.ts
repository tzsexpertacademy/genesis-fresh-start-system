// Simple state manager without complex functionality
class SimpleStateManager {
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

  // Simple mock functions for compatibility
  setProcessing(value: boolean) {
    console.log('Set processing:', value);
  }

  isProcessing() {
    return false;
  }

  registerComponent(name: string) {
    console.log('Registered component:', name);
  }

  unregisterComponent(name: string) {
    console.log('Unregistered component:', name);
  }

  shouldThrottleUpdates(interval: number) {
    return false;
  }

  isComponentActive(name: string) {
    return false;
  }

  debounce(key: string, interval: number) {
    return true;
  }

  preventRefreshDuringProcessing() {
    return () => console.log('Cleanup refresh prevention');
  }
}

export const simpleStateManager = new SimpleStateManager();