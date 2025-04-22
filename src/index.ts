import { Router, withContent } from 'itty-router';
import { error, json } from 'itty-router-extras';
import { FreshBooksClient, FreshBooksAuth } from '@/lib/freshbooks';
import { TokenManager } from '@/lib/token';
import { FreshBooksApiError, FreshBooksRateLimitError, FreshBooksWebhookPayload } from '@/types/freshbooks';
import { Env } from '@/types/env';
import { verifyWebhookSignature } from '@/lib/webhook/verify';
import { processInvoice } from '@/lib/invoice/processor';
import { registerWebhook } from '@/lib/webhook/register';

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

// Create router
const router = Router();

// OAuth routes - keep these for initial setup and token refresh
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

// Webhook handler for FreshBooks invoice.create events
router.post('/webhooks/ready', withContent, async (request: Request, env: Env) => {
  try {

    const response = await request;

    // only needed to verify the webhook with FreshBooks
    if (response.headers.get('Content-Type') === 'application/x-www-form-urlencoded') {
      const client = await TokenManager.getInstance().getAuthenticatedClient(env);
      console.log(response.content);

      const verifier = response.content.get('verifier');

      const verification = await client.verifyWebhook('827106', verifier);
      return Response.json({ 
        status: 'success', 
        message: 'Verification successful',
        verifier
      });
    }

    console.log('Webhook payload:', JSON.stringify(response, null, 2));

    const payload = JSON.parse(response) as FreshBooksWebhookPayload;

    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(request.clone(), env);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return Response.json({ 
        status: 'error', 
        message: 'Invalid signature' 
      }, { status: 401 });
    }

    // Verify it's an invoice.create event
    if (payload.event_type !== 'invoice.create') {
      return Response.json({ 
        status: 'ignored', 
        reason: 'Not an invoice.create event' 
      });
    }
    
    // Extract invoice data
    const invoiceId = payload.data.invoice_id;
    const accountId = payload.data.account_id;
    
    // Log the webhook event
    console.log(`Processing invoice.create webhook for invoice ${invoiceId}`);
    
    // Process the invoice
    const result = await processInvoice(invoiceId, client, env);
    
    return Response.json({ 
      status: 'success', 
      result 
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

router.get('/webhooks/resend-code', async (request, env) => {
  try {
    const client = await TokenManager.getInstance().getAuthenticatedClient(env);
    const response = await client.resendVerificationCode('827106');
    return Response.json({ 
      status: 'success', 
      message: 'Verification code resent',
      code: response
    });
  } catch (error) {
    console.error('Error resending verification code:', error);
    return Response.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// Debug endpoint to list invoices (useful for testing)
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

router.get('/webhooks/register', async (request, env) => {
  try {
    const client = await TokenManager.getInstance().getAuthenticatedClient(env);
    console.log('Registering webhook...', client);
    const response = await client.registerWebhook(env);
    console.log('Webhook registered successfully');
    return new Response('Webhook registered successfully', { status: 200, response });
  } catch (error) {
    console.error('Error registering webhook:', error);
    return new Response('Failed to register webhook', { status: 500 });
  }
});

// Simple status endpoint
router.get('/', () => new Response(
  'FreshBooks to Kforce Invoice Converter Webhook Service is running',
  { headers: { 'Content-Type': 'text/plain' } }
));

// 404 handler
router.all('*', () => new Response('Not found', { status: 404 }));

// Export the worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx);
  },
};

export * from '@/lib/freshbooks';
export * from '@/lib/token';
export * from '@/types/env';
export * from '@/types/freshbooks';