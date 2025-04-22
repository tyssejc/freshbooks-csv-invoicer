import { FreshBooksAuth } from '@/lib/freshbooks';
import { jest } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';

describe('FreshBooksAuth', () => {
  let auth: FreshBooksAuth;

  beforeEach(() => {
    fetchMock.resetMocks();
    auth = new FreshBooksAuth(
      'test-client-id',
      'test-client-secret',
      'https://test.example.com/oauth/callback'
    );
  });

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = auth.getAuthorizationUrl();
      const parsedUrl = new URL(url);
      
      expect(parsedUrl.origin).toBe('https://auth.freshbooks.com');
      expect(parsedUrl.pathname).toBe('/oauth/authorize');
      expect(parsedUrl.searchParams.get('client_id')).toBe('test-client-id');
      expect(parsedUrl.searchParams.get('response_type')).toBe('code');
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe('https://test.example.com/oauth/callback');
    });

    it('should throw error for non-HTTPS redirect URI', () => {
      expect(() => {
        new FreshBooksAuth(
          'test-client-id',
          'test-client-secret',
          'http://test.example.com/callback'
        );
      }).toThrow('Redirect URI must use HTTPS');
    });

    it('should allow HTTP for Cloudflare tunnel URLs', () => {
      const auth = new FreshBooksAuth(
        'test-client-id',
        'test-client-secret',
        'http://test.trycloudflare.com/callback'
      );
      const url = auth.getAuthorizationUrl();
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('redirect_uri')).toBe('https://test.trycloudflare.com/callback');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const tokens = await auth.exchangeCodeForToken('test-code');
      expect(tokens).toEqual(mockResponse);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.freshbooks.com/auth/oauth/token');
      expect(options).toMatchObject({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const body = JSON.parse(options?.body as string);
      expect(body).toEqual({
        grant_type: 'authorization_code',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        code: 'test-code',
        redirect_uri: 'https://test.example.com/oauth/callback'
      });
    });

    it('should handle exchange error', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });

      await expect(auth.exchangeCodeForToken('invalid-code'))
        .rejects
        .toThrow('Failed to exchange code for token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      const tokens = await auth.refreshAccessToken('old-refresh-token');
      expect(tokens).toEqual(mockResponse);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.freshbooks.com/auth/oauth/token');
      expect(options).toMatchObject({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const body = JSON.parse(options?.body as string);
      expect(body).toEqual({
        grant_type: 'refresh_token',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        refresh_token: 'old-refresh-token'
      });
    });

    it('should handle refresh error', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });

      await expect(auth.refreshAccessToken('invalid-refresh-token'))
        .rejects
        .toThrow('Failed to refresh access token');
    });
  });
});
