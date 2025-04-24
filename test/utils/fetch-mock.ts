// Mock implementation of fetch for testing
import { vi } from 'vitest';

type FetchMock = ReturnType<typeof vi.fn<any[], Promise<Response>>> & {
  mockResponseOnce: (responseData: any, init?: ResponseInit) => void;
};

export const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  // Default mock implementation
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}) as FetchMock;

// Helper to mock a specific response
fetchMock.mockResponseOnce = (responseData: any, init?: ResponseInit) => {
  const body = typeof responseData === 'string' 
    ? responseData 
    : JSON.stringify(responseData);
    
  fetchMock.mockImplementationOnce(async () => new Response(body, init));
};

// Global fetch mock
global.fetch = fetchMock;
