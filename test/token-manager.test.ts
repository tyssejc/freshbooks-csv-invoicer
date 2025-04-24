import { TokenManager } from '@/lib/token';
import { env } from 'cloudflare:test';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import mockFetchResponse from './utils/mock-fetch-response';

// Define the KV store interface to match Env.CREDENTIALS
// interface KVStore {
//   get(key: string): Promise<string | null>;
//   put(key: string, value: string): Promise<void>;
//   delete(key: string): Promise<void>;
// }

describe('TokenManager', () => {

  let tokenManager: TokenManager;

  // Create mock KV namespace
  const mockKV = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };

  // Create mock environment
  const mockEnv = {
    CREDENTIALS: mockKV,
    FRESHBOOKS_ACCOUNT_ID: 'test-account-id'
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Use type assertion to access private static field
    (TokenManager as any)['instance'] = undefined;
    tokenManager = TokenManager.getInstance();

    // Set default mock implementations
    mockKV.get.mockImplementation(() => Promise.resolve(null));
    mockKV.put.mockImplementation(() => Promise.resolve());
    mockKV.delete.mockImplementation(() => Promise.resolve());
  });

  describe('getInstance', () => {
    it('should maintain singleton instance', () => {
      const instance1 = TokenManager.getInstance();
      const instance2 = TokenManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getAuthenticatedClient', () => {
    it('should create client with stored tokens', async () => {
      const tokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: Date.now() + 3600000
      };

      mockKV.get.mockResolvedValueOnce(JSON.stringify(tokens));

      const client = await tokenManager.getAuthenticatedClient(mockEnv);
      expect(client).toBeDefined();
      expect(mockKV.get).toHaveBeenCalledWith('oauth_tokens');
    });

    it('should throw error when no tokens available', async () => {
      mockKV.get.mockResolvedValueOnce(null);

      await expect(tokenManager.getAuthenticatedClient(mockEnv))
        .rejects
        .toThrow('No tokens available');
    });
  });

  describe('updateTokens', () => {
    it('should store tokens in KV', async () => {
      const tokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 3600000
      };

      await tokenManager.updateTokens(mockEnv, tokens);

      expect(mockKV.put).toHaveBeenCalledWith(
        'oauth_tokens',
        JSON.stringify(tokens)
      );
    });
  });

  describe('clearTokens', () => {
    it('should remove tokens from KV', async () => {
      await tokenManager.clearTokens(mockEnv);
      expect(mockKV.delete).toHaveBeenCalledWith('oauth_tokens');
    });
  });
});
