import { describe, it, expect } from 'vitest';
import mockFetchResponse from './utils/mock-fetch-response';

describe('Cloudflare Worker Environment', () => {
  it('should have access to Cloudflare Worker globals', () => {
    // Check for Worker globals
    expect(typeof globalThis.Response).toBe('function');
    expect(typeof globalThis.Request).toBe('function');
    expect(typeof globalThis.Headers).toBe('function');
    expect(typeof globalThis.fetch).toBe('function');
  });

  it('should support fetch API', async () => {
    // This test will be skipped in CI environments
    // but will run locally with the worker environment
    const expectedResponse = { success: true };
    const mockFetch = mockFetchResponse(expectedResponse);

    const response = await fetch('https://api.example.com/');
    
    const data = await response.json();
    expect(data).toEqual(expectedResponse);
  });
});
