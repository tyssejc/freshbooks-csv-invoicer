import { Hono } from 'hono';
import { FreshBooksClient, FreshBooksAuth } from '@/lib/freshbooks';
import { TokenManager } from '@/lib/token';
import { FreshBooksApiError, FreshBooksRateLimitError, FreshBooksWebhookPayload } from '@/types/freshbooks';
import { Env } from '@/types/env';
import { verifyWebhookSignature } from '@/lib/freshbooks/util';
import { processInvoice } from '@/lib/invoice/processor';

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

// Create Hono app
const app = new Hono<{
  Bindings: Env;
  Variables: {
    content?: any;
  }
}>();

// Middleware for parsing request body
app.use('*', async (c, next) => {
  if (c.req.method === 'POST' || c.req.method === 'PUT') {
    try {
      const contentType = c.req.header('Content-Type');
      if (contentType?.includes('application/json')) {
        const body = await c.req.json();
        c.set('content', body);
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await c.req.formData();
        const formDataObj: Record<string, string> = {};
        formData.forEach((value, key) => {
          formDataObj[key] = value.toString();
        });
        c.set('content', formDataObj);
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
    }
  }
  await next();
});

// OAuth routes - keep these for initial setup and token refresh
app.get('/oauth/init', async (c) => {
  const env = c.env;
  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/oauth/callback`;
  
  const auth = new FreshBooksAuth(
    env.FRESHBOOKS_CLIENT_ID,
    env.FRESHBOOKS_CLIENT_SECRET,
    env.OAUTH_REDIRECT_URI
  );
  return c.redirect(auth.getAuthorizationUrl());
});

app.get('/oauth/callback', async (c) => {
  const env = c.env;
  const url = new URL(c.req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return c.text('No code provided', 400);
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

    return c.text('Successfully connected to FreshBooks!', 200);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return c.text(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
});

// Webhook handler for FreshBooks invoice.create events
app.post('/webhooks/ready', async (c) => {
  try {
    // only needed to verify the webhook with FreshBooks
    if (c.req.header('Content-Type') === 'application/x-www-form-urlencoded') {
      const client = await TokenManager.getInstance().getAuthenticatedClient(c.env);
      const content = c.get('content');
      console.log(content);

      const verifier = content.verifier;

      const verification = await client.verifyWebhook('827106', verifier);
      return c.json({ 
        status: 'success', 
        message: 'Verification successful',
        verifier
      });
    }

    const content = c.get('content');
    console.log('Webhook payload:', JSON.stringify(content, null, 2));

    // assuming JSON here
    const payload = content as FreshBooksWebhookPayload;

    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(c.req.raw.clone(), c.env);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return c.json({ 
        status: 'error', 
        message: 'Invalid signature' 
      }, 401);
    }

    // Verify it's an invoice.create event
    if (payload.event_type !== 'invoice.create') {
      return c.json({ 
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
    const client = await TokenManager.getInstance().getAuthenticatedClient(c.env);
    const result = await processInvoice(invoiceId, client, c.env);
    
    return c.json({ 
      status: 'success', 
      result 
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/webhooks/resend-code', async (c) => {
  try {
    const client = await TokenManager.getInstance().getAuthenticatedClient(c.env);
    const response = await client.resendVerificationCode('827106');
    return c.json({ 
      status: 'success', 
      message: 'Verification code resent',
      code: response
    });
  } catch (error) {
    console.error('Error resending verification code:', error);
    return c.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Debug endpoint to list invoices (useful for testing)
app.get('/list-invoices', async (c) => {
  try {
    const client = await TokenManager.getInstance().getAuthenticatedClient(c.env);

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

    return c.json({
      success: true,
      invoices,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, 500);
  }
});

app.get('/webhooks/register', async (c) => {
  try {
    const client = await TokenManager.getInstance().getAuthenticatedClient(c.env);
    console.log('Registering webhook...', client);
    const response = await client.registerWebhook(c.env);
    console.log('Webhook registered successfully');
    return c.text('Webhook registered successfully', 200);
  } catch (error) {
    console.error('Error registering webhook:', error);
    return c.text('Failed to register webhook', 500);
  }
});

// Simple status endpoint
app.get('/', (c) => c.text('FreshBooks to Kforce Invoice Converter Webhook Service is running', 200));

// 404 handler
app.all('*', (c) => c.text('Not found', 404));

// Export the worker
export default {
  fetch: app.fetch,
};

export * from '@/lib/freshbooks';
export * from '@/lib/token';
export * from '@/types/env';
export * from '@/types/freshbooks';