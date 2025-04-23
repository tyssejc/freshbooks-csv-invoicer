import { TokenManager } from '@/lib/token';

export class FreshBooksAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    // Ensure redirect URI uses HTTPS (except for Cloudflare tunnel URLs)
    const url = new URL(redirectUri);
    if (url.protocol === 'http:' && !url.hostname.endsWith('.trycloudflare.com')) {
      throw new Error('Redirect URI must use HTTPS');
    }
    if (url.protocol === 'http:' && url.hostname.endsWith('.trycloudflare.com')) {
      url.protocol = 'https:';
      this.redirectUri = url.toString();
    } else {
      this.redirectUri = redirectUri;
    }
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri
    });

    return `https://auth.freshbooks.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<any> {
    const response = await fetch('https://api.freshbooks.com/auth/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const response = await fetch('https://api.freshbooks.com/auth/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    return response.json();
  }
}
