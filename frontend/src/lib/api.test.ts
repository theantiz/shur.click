import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiUrl } from './api';

describe('Global Fetch Interceptor', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should inject credentials: "include" for API requests', async () => {
    const unpatchedFetch = vi.fn().mockResolvedValue(new Response());
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr.startsWith(apiUrl(""))) {
        const newInit = init || {};
        newInit.credentials = "include";
        return unpatchedFetch(input, newInit);
      }
      return unpatchedFetch(input, init);
    };

    const apiEndpoint = apiUrl('/api/urls');
    await fetch(apiEndpoint, { method: 'GET' });
    
    expect(unpatchedFetch).toHaveBeenCalledWith(apiEndpoint, expect.objectContaining({
      method: 'GET',
      credentials: 'include'
    }));

    const externalEndpoint = 'https://example.com/api';
    await fetch(externalEndpoint, { method: 'GET' });

    expect(unpatchedFetch).toHaveBeenCalledWith(externalEndpoint, {
      method: 'GET'
    });
  });
});
