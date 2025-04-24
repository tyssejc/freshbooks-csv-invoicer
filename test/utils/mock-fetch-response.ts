import { vi } from 'vitest';

/**
 * Mocks the global fetch function to return a specific response.
 * 
 * @param response The response data to return.
 * @param options Optional configuration for the mock.
 * @param options.status The HTTP status code to return.
 * @param options.headers Additional headers to include in the response.
 * @param options.throwError If true, the mock will throw an error instead of returning a response.
 * @returns A spy object that can be used to verify the number of times the mock was called.
 */
export default function mockFetchResponse(response: any, options: {
  status?: number;
  headers?: Record<string, string>;
  throwError?: boolean;
} = {}) {
  const { status = 200, headers = {}, throwError = false } = options;
  
  if (throwError) {
    return vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
  }
  
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => response
  } as Response);
}