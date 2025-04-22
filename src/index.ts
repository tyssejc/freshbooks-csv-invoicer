import { Router } from 'itty-router';
import { error, json } from 'itty-router-extras';
import { FreshBooksClient } from './freshbooks-client';
import { TokenManager } from './token-manager';

// Types
export interface TimeEntry {
  date: string;
  hours: number;
  rate: number;
  notes?: string;
}

export interface VendorInfo {
  vendorId: string;
  vendorName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  consultantId: string;
  consultantName: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface Env {
  // KV Namespace for storing credentials
  CREDENTIALS: KVNamespace;
  // FreshBooks credentials
  FRESHBOOKS_CLIENT_ID: string;
  FRESHBOOKS_CLIENT_SECRET: string;
  FRESHBOOKS_ACCOUNT_ID: string;
  // Environment variables for vendor info
  VENDOR_ID: string;
  VENDOR_NAME: string;
  VENDOR_ADDRESS: string;
  VENDOR_CITY: string;
  VENDOR_STATE: string;
  VENDOR_ZIP: string;
  CONSULTANT_ID: string;
  CONSULTANT_NAME: string;
  VENDOR_CONTACT: string;
  VENDOR_PHONE: string;
  VENDOR_EMAIL: string;
  OAUTH_REDIRECT_URI: string;
}

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface InvoiceRequest {
  invoiceId: string;
}

export class FreshBooksAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private readonly authUrl = 'https://auth.freshbooks.com/oauth/authorize';
  private readonly tokenUrl = 'https://api.freshbooks.com/auth/oauth/token';
  private currentTokens: OAuthTokens | null = null;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  setTokens(tokens: OAuthTokens): void {
    this.currentTokens = tokens;
  }

  getAccessToken(): string {
    if (!this.currentTokens) {
      throw new Error('No tokens available');
    }
    return this.currentTokens.access_token;
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const response = await fetch(this.tokenUrl, {
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

    const tokens = await response.json();
    this.currentTokens = tokens;
    return tokens;
  }

  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const response = await fetch(this.tokenUrl, {
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

    const tokens = await response.json();
    this.currentTokens = tokens;
    return tokens;
  }

  async getCurrentTokens(): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
    return this.currentTokens;
  }

  async refreshCurrentToken(): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    if (!this.currentTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }
    return this.refreshAccessToken(this.currentTokens.refresh_token);
  }
}

// Create router
const router = Router();

// OAuth routes
router.get('/oauth/init', async (request: Request, env: Env) => {
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/oauth/callback`;
  
  const auth = new FreshBooksAuth(
    env.FRESHBOOKS_CLIENT_ID,
    env.FRESHBOOKS_CLIENT_SECRET,
    env.OAUTH_REDIRECT_URI
  );
  return Response.redirect(auth.getAuthorizationUrl(), 302);
});

router.get('/oauth/callback', async (request, env) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('No code provided', { status: 400 });
  }

  try {
    const auth = new FreshBooksAuth(
      env.FRESHBOOKS_CLIENT_ID,
      env.FRESHBOOKS_CLIENT_SECRET,
      env.OAUTH_REDIRECT_URI
    );
    const tokens = await auth.exchangeCodeForToken(code);
    
    // Store tokens using TokenManager
    await TokenManager.getInstance().updateTokens(env, tokens);

    return new Response('Successfully connected to FreshBooks!', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
});

// Invoice processing route
router.post('/', async (request: Request, env: Env) => {
  try {
    const { invoiceId } = await request.json() as InvoiceRequest;
    if (!invoiceId) {
      return new Response('Invoice ID required', { status: 400 });
    }

    // Get OAuth tokens
    const client = await TokenManager.getInstance().getAuthenticatedClient(env);

    // TODO: Implement invoice processing with OAuth token
    return new Response(JSON.stringify({
      success: true,
      message: 'OAuth token available, invoice processing to be implemented'
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});

router.get('/list-invoices', async (request, env) => {
  try {
    const client = await TokenManager.getInstance().getAuthenticatedClient(env);

    // Calculate date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Fetch invoices
    const invoices = await client.listInvoices({
      dateFrom: startDate,
      dateTo: endDate,
      per_page: 25
    });

    return Response.json({
      success: true,
      invoices,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
});

// Main routes
router.get('/', () => new Response(
  `<!DOCTYPE html>
  <html>
    <head>
      <title>FreshBooks to Kforce Invoice Converter</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 p-8">
      <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 class="text-2xl font-bold mb-4">FreshBooks to Kforce Invoice Converter</h1>
        <div class="space-y-4">
          <a href="/oauth/init" class="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Connect FreshBooks Account
          </a>
          <div>
            <h2 class="text-xl font-semibold mb-2">Generate Invoice CSV</h2>
            <form action="/generate-csv" method="POST" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" name="startDate" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">End Date</label>
                <input type="date" name="endDate" required class="mt-1 block w-full rounded-gray-300 shadow-sm">
              </div>
              <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                Generate CSV
              </button>
            </form>
          </div>
        </div>
      </div>
    </body>
  </html>`,
  { headers: { 'Content-Type': 'text/html' } }
));

// 404 handler
router.all('*', () => new Response('Not found', { status: 404 }));

// Export the worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx);
  },
};

export * from './lib/freshbooks';
export * from './lib/token';
export * from './types/env';
export * from './types/freshbooks';