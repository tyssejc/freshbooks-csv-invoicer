// Mock implementation of fetch for testing
type FetchMock = jest.Mock<Promise<Response>> & {
  mockResponseOnce: (body: string, init?: ResponseInit) => void;
};

export const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  // Default mock implementation
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}) as FetchMock;

// Helper to mock a specific response
fetchMock.mockResponseOnce = (body: string, init?: ResponseInit) => {
  fetchMock.mockImplementationOnce(async () => new Response(body, init));
};

// Global fetch mock
global.fetch = fetchMock;
