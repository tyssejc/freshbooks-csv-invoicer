import { TokenManager } from '@/lib/token';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Env } from '@/types/env';

// Define the KV store interface to match Env.CREDENTIALS
interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

describe('TokenManager', () => {
  // Create mock KV store with proper typing
  const mockKV: KVStore = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };

  const mockEnv: Env = {
    FRESHBOOKS_CLIENT_ID: 'test-client-id',
    FRESHBOOKS_CLIENT_SECRET: 'test-client-secret',
    FRESHBOOKS_ACCOUNT_ID: 'test-account-id',
    OAUTH_REDIRECT_URI: 'https://test.example.com/oauth/callback',
    VENDOR_ID: 'test-vendor',
    VENDOR_NAME: 'Test Vendor',
    VENDOR_ADDRESS: '123 Test St',
    VENDOR_CITY: 'Test City',
    VENDOR_STATE: 'TS',
    VENDOR_ZIP: '12345',
    VENDOR_PHONE: '555-0123',
    VENDOR_EMAIL: 'test@example.com',
    VENDOR_CONTACT: 'Test Contact',
    CONSULTANT_ID: 'test-consultant',
    CONSULTANT_NAME: 'Test Consultant',
    CREDENTIALS: mockKV
  };

  let tokenManager: TokenManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Use type assertion to access private static field
    (TokenManager as any)['instance'] = undefined;
    tokenManager = TokenManager.getInstance();

    // Reset mock implementations
    vi.mocked(mockKV.get).mockImplementation(() => Promise.resolve(null));
    vi.mocked(mockKV.put).mockImplementation(() => Promise.resolve());
    vi.mocked(mockKV.delete).mockImplementation(() => Promise.resolve());
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

      vi.mocked(mockKV.get).mockResolvedValueOnce(JSON.stringify(tokens));

      const client = await tokenManager.getAuthenticatedClient(mockEnv);
      expect(client).toBeDefined();
      expect(mockKV.get).toHaveBeenCalledWith('oauth_tokens');
    });

    it('should throw error when no tokens available', async () => {
      vi.mocked(mockKV.get).mockResolvedValueOnce(null);

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
