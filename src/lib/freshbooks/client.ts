import { Env } from '@/types/env';
import {
  FreshBooksRateLimitError,
  FreshBooksAuthError,
  FreshBooksApiError,
  FreshBooksResponse,
  FreshBooksInvoice
} from '@/types/freshbooks';

export class FreshBooksClient {
  private accessToken: string;
  private accountId: string;

  constructor(accessToken: string, accountId: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`https://api.freshbooks.com${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Api-Version': '2023-11-01'
      }
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      throw new FreshBooksRateLimitError(retryAfter);
    }

    if (response.status === 401) {
      throw new FreshBooksAuthError('Authentication failed');
    }

    if (!response.ok) {
      throw new FreshBooksApiError(`FreshBooks API error: ${response.status}`, response.status);
    }

    const data = await response.json();
    return data as T;
  }

  async listInvoices(): Promise<FreshBooksInvoice[]> {
    const response = await this.makeRequest<FreshBooksResponse<FreshBooksInvoice[]>>(`/accounting/account/${this.accountId}/invoices/invoices`);
    return response.response.result.invoices;
  }

  async getInvoice(invoiceId: string): Promise<FreshBooksInvoice> {
    const response = await this.makeRequest<FreshBooksResponse<FreshBooksInvoice>>(`/accounting/account/${this.accountId}/invoices/invoices/${invoiceId}`);
    return response.response.result.invoice;
  }
}
