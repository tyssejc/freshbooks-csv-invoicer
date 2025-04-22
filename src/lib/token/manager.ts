import { Env } from '@/types/env';
import { FreshBooksClient } from '@/lib/freshbooks';

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class TokenManager {
  private static instance: TokenManager;
  private tokens: OAuthTokens | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getAuthenticatedClient(env: Env): Promise<FreshBooksClient> {
    if (!this.tokens) {
      const storedTokens = await env.CREDENTIALS.get('oauth_tokens');
      if (!storedTokens) {
        throw new Error('No tokens available');
      }
      this.tokens = JSON.parse(storedTokens);
    }

    if (!this.tokens) {
      throw new Error('Failed to parse tokens');
    }

    return new FreshBooksClient(this.tokens.access_token, env.FRESHBOOKS_ACCOUNT_ID);
  }

  async updateTokens(env: Env, tokens: OAuthTokens): Promise<void> {
    this.tokens = tokens;
    await env.CREDENTIALS.put('oauth_tokens', JSON.stringify(tokens));
  }

  async clearTokens(env: Env): Promise<void> {
    this.tokens = null;
    await env.CREDENTIALS.delete('oauth_tokens');
  }
}
