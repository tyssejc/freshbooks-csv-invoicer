import {
  env,
  createExecutionContext,
  waitOnExecutionContext
} from 'cloudflare:test';
import { FreshBooksAuth } from '@/lib/freshbooks';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import worker from '../src';

// Use this for now to get a correctly-typed Request to pass to fetch
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('FreshBooksAuth', () => {
  let auth: FreshBooksAuth;

  beforeEach(() => {
    vi.resetAllMocks();
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
      const request = new IncomingRequest('https://test.example.com/oauth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'code=test-code'
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);

      await waitOnExecutionContext(ctx);

      const mockResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600
      };

      const tokens = await auth.exchangeCodeForToken('test-code');
      expect(tokens).toEqual(mockResponse);

      expect(fetchMock).toHaveBeenCalledTimes(1);
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
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' })
      } as Response);

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

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response);

      const tokens = await auth.refreshAccessToken('old-refresh-token');
      expect(tokens).toEqual(mockResponse);

      expect(fetchMock).toHaveBeenCalledTimes(1);
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
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' })
      } as Response);

      await expect(auth.refreshAccessToken('invalid-refresh-token'))
        .rejects
        .toThrow('Failed to refresh access token');
    });
  });
});
