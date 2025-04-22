import { FreshBooksAuth } from '../index';
import { FreshBooksClient } from '../freshbooks-client';
import { FreshBooksApiError, FreshBooksRateLimitError } from '../types/freshbooks';

/**
 * Example 1: Basic Invoice Fetching
 * This example shows how to fetch recent invoices from the last 30 days
 */
async function fetchRecentInvoices(env: {
  FRESHBOOKS_CLIENT_ID: string;
  FRESHBOOKS_CLIENT_SECRET: string;
  FRESHBOOKS_ACCOUNT_ID: string;
}) {
  try {
    // Initialize auth and client
    const auth = new FreshBooksAuth(env.FRESHBOOKS_CLIENT_ID, env.FRESHBOOKS_CLIENT_SECRET);
    const client = new FreshBooksClient(auth, env.FRESHBOOKS_ACCOUNT_ID);

    // Calculate date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Fetch invoices
    const invoices = await client.listInvoices({
      dateFrom: startDate,
      dateTo: endDate,
      status: 'paid',
      per_page: 25
    });

    console.log(`Found ${invoices.length} invoices from ${startDate} to ${endDate}`);
    return invoices;
  } catch (error) {
    if (error instanceof FreshBooksRateLimitError) {
      console.error(`Rate limited. Try again in ${error.retryAfter} seconds`);
    } else if (error instanceof FreshBooksApiError) {
      console.error(`API Error (${error.status}): ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

/**
 * Example 2: Batch Processing
 * This example shows how to process multiple pages of invoices
 */
async function processAllInvoices(
  client: FreshBooksClient,
  processor: (invoice: any) => Promise<void>
) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const invoices = await client.listInvoices({
      page,
      per_page: 100 // Maximum page size
    });

    // Process each invoice
    await Promise.all(invoices.map(processor));

    // Check if we need to fetch more
    hasMore = invoices.length === 100;
    page++;
  }
}

/**
 * Example 3: Invoice Details
 * This example shows how to fetch and process a specific invoice
 */
async function getInvoiceDetails(
  client: FreshBooksClient,
  invoiceId: string
) {
  try {
    const invoice = await client.getInvoice(invoiceId);

    // Extract key information
    const summary = {
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount.amount,
      currency: invoice.amount.code,
      status: invoice.payment_status,
      created: new Date(invoice.create_date),
      due: new Date(invoice.due_date),
      lineItems: invoice.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        rate: line.rate.amount,
        amount: line.amount.amount
      }))
    };

    return summary;
  } catch (error) {
    if (error instanceof FreshBooksApiError && error.status === 404) {
      console.error(`Invoice ${invoiceId} not found`);
    }
    throw error;
  }
}

/**
 * Example 4: Error Recovery
 * This example shows how to handle rate limiting with exponential backoff
 */
async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof FreshBooksRateLimitError) {
        const waitTime = error.retryAfter || Math.pow(2, attempt);
        console.log(`Rate limited. Waiting ${waitTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

/**
 * Example Usage:
 * 
 * // Initialize
 * const auth = new FreshBooksAuth(clientId, clientSecret);
 * const client = new FreshBooksClient(auth, accountId);
 * 
 * // Fetch recent invoices
 * const invoices = await fetchRecentInvoices(env);
 * 
 * // Process all invoices
 * await processAllInvoices(client, async (invoice) => {
 *   console.log(`Processing invoice ${invoice.invoice_number}`);
 * });
 * 
 * // Get specific invoice with retry
 * const invoice = await fetchWithRetry(() => 
 *   getInvoiceDetails(client, 'INVOICE-123')
 * );
 */
