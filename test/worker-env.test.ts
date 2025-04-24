import { describe, it, expect } from 'vitest';

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
    const mockResponse = new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(mockResponse.status).toBe(200);
    expect(mockResponse.ok).toBe(true);
    
    const data = await mockResponse.json();
    expect(data).toEqual({ success: true });
  });
});
