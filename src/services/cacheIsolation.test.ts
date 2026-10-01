import { afterEach, describe, expect, it } from 'vitest';

function installStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });
}

describe('dashboard cache isolation', () => {
  afterEach(async () => {
    const { apiCache } = await import('./apiCache');
    apiCache.clear();
  });

  it('drops the previous user cache on logout', async () => {
    installStorage();
    const { apiCache } = await import('./apiCache');
    const { enhancedApiService } = await import('./api.enhanced');

    apiCache.set('dashboard:counts', { role: 'admin', bookings: 10 }, 60_000);
    apiCache.set('dashboard:stats', { role: 'admin', revenue: 5000 }, 120_000);

    enhancedApiService.logout();

    expect(apiCache.get('dashboard:counts')).toBeNull();
    expect(apiCache.get('dashboard:stats')).toBeNull();
  });

  it('stays empty across repeated logout', async () => {
    installStorage();
    const { apiCache } = await import('./apiCache');
    const { enhancedApiService } = await import('./api.enhanced');

    apiCache.set('sidebar:counts', { inquiries: 4 }, 60_000);
    enhancedApiService.logout();
    apiCache.set('sidebar:counts', { inquiries: 1 }, 60_000);
    enhancedApiService.logout();

    expect(apiCache.get('sidebar:counts')).toBeNull();
  });
});
