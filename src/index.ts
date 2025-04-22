import { Router } from 'itty-router';
import { error, json } from 'itty-router-extras';
import { FreshBooksClient, FreshBooksAuth } from '@/lib/freshbooks';
import { TokenManager } from '@/lib/token';
import { FreshBooksApiError, FreshBooksRateLimitError } from '@/types/freshbooks';
import { Env } from '@/types/env';

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

interface InvoiceRequest {
  invoiceId: string;
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

// Main POST route
// router.post('/', async (request: Request, env: Env) => {
//   try {
//     const { invoiceId } = await request.json() as InvoiceRequest;
//     if (!invoiceId) {
//       return new Response('Invoice ID required', { status: 400 });
//     }

//     // Get OAuth tokens
//     const client = await TokenManager.getInstance().getAuthenticatedClient(env);

//     // TODO: Implement invoice processing with OAuth token
//     return new Response(JSON.stringify({
//       success: true,
//       message: 'OAuth token available, invoice processing to be implemented'
//     }), {
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//   } catch (error) {
//     console.error('Error processing request:', error);
//     return new Response(JSON.stringify({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error',
//     }), {
//       status: 500,
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//   }
// });

// List invoices route (mostly for debugging)
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

router.post('/generate-csv', async (request, env) => {
  try {
    const client = await TokenManager.getInstance().getAuthenticatedClient(env);

    // TODO: Validate request body

    const { customerId, endDate, startDate } = request.body;

    // TODO: create line items for invoice
    const lineItems = [];

    // TODO: create CSV file of invoice to attach to the invoice
    
    //upload invoice attachment
    const attachment = await client.uploadAttachment(csvInvoice);
    const { jwt, media_type } = attachment;

    // TODO: Create invoice in Freshbooks
    const invoice = await client.createInvoice({
      due_offset_days: 30,
      create_date: Date.now().toISOString().split('T')[0],
      invoice_number: `TEST-${Date.now()}`,
      lines: lineItems,
      attachments: [
        {
          expenseid: null,
          jwt,
          media_type
        }
      ],
      customerid: customerId
    });

    // TODO: Get the invoice we created above from Freshbooks

    // TODO: Use data from that invoice to generate a CSV

    // TODO: Allow user to review the CSV and confirm whether to send to specified email address

    // TODO: Email the CSV to the specified email address using the template specified

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Invoice CSV Generator</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 p-8">
          <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h1 class="text-2xl font-bold mb-4">Invoice CSV Generator</h1>
            <div class="space-y-4">
              <h2 class="text-xl font-semibold mb-2">Generated CSV</h2>
              
            </div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('Error generating CSV:', error);
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
          <a href="/oauth/init" target="_blank"class="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Connect FreshBooks Account
          </a>
          <div>
            <h2 class="text-xl font-semibold mb-2">Generate Invoice CSV</h2>
            <form action="/generate-csv" method="POST" class="space-y-4">
              <select name="customer" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                <option value="">Select a client</option>
                <option value="1575525">Kforce</option>
              </select>
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

export * from '@/lib/freshbooks';
export * from '@/lib/token';
export * from '@/types/env';
export * from '@/types/freshbooks';