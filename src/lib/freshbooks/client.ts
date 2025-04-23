import { Env } from '@/types/env';
import {
  FreshBooksRateLimitError,
  FreshBooksAuthError,
  FreshBooksApiError,
  FreshBooksResponse,
  FreshBooksInvoice,
  FreshBooksAttachment
} from '@/types/freshbooks';

export class FreshBooksClient {
  private accessToken: string;
  private accountId: string;

  constructor(accessToken: string, accountId: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, body?: any): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Api-Version': '2023-11-01'
      }
    };

    // Add body if provided
    if (body) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(`https://api.freshbooks.com${endpoint}`, requestOptions);

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

  async listInvoices(options: { dateFrom?: string; dateTo?: string; per_page?: number } = {}): Promise<FreshBooksInvoice[]> {
    const queryParams = new URLSearchParams();
    if (options.dateFrom) queryParams.append('date_from', options.dateFrom);
    if (options.dateTo) queryParams.append('date_to', options.dateTo);
    if (options.per_page) queryParams.append('per_page', options.per_page.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await this.makeRequest<FreshBooksResponse<FreshBooksInvoice[]>>(
      `/accounting/account/${this.accountId}/invoices/invoices${queryString}`
    );
    return response.response.result.invoices;
  }

  async createInvoice(invoice: FreshBooksInvoice): Promise<FreshBooksInvoice> {
    const response = await this.makeRequest<FreshBooksResponse<FreshBooksInvoice>>(
      `/accounting/account/${this.accountId}/invoices/invoices`,
      { method: 'POST' },
      { invoice }
    );
    return response.response.result.invoice;
  }

  async getInvoice(invoiceId: string): Promise<FreshBooksInvoice> {
    const response = await this.makeRequest<FreshBooksResponse<FreshBooksInvoice>>(
      `/accounting/account/${this.accountId}/invoices/invoices/${invoiceId}`
    );
    return response.response.result.invoice;
  }

  async updateInvoice(invoiceId: string, invoiceData: Partial<FreshBooksInvoice>): Promise<FreshBooksInvoice> {
    const response = await this.makeRequest<FreshBooksResponse<FreshBooksInvoice>>(
      `/accounting/account/${this.accountId}/invoices/invoices/${invoiceId}`,
      { method: 'PUT' },
      { invoice: invoiceData }
    );
    return response.response.result.invoice;
  }

  async uploadAttachment(attachment: File): Promise<FreshBooksAttachment> {
    const formData = new FormData();
    formData.append('attachment', attachment);
    
    const response = await this.makeRequest<FreshBooksResponse<FreshBooksAttachment>>(
      `/uploads/account/${this.accountId}/attachments`,
      {
        method: 'POST',
        headers: {
          // Remove Content-Type so browser can set it with the boundary
          'Content-Type': undefined
        },
        body: formData
      }
    );
    return response.response.result.attachment;
  }

  async registerWebhook(env: Env): Promise<void> {
    const response = await this.makeRequest(
      `/events/account/${this.accountId}/events/callbacks`,
      { method: 'POST' },
      {
        callback: {
          uri: `${env.FRESHBOOKS_WEBHOOK_URL}/webhooks/ready`,
          event: 'invoice.create'
        }
      }
    );
    return response;
  }

  async resendVerificationCode(callbackId: string): Promise<void> {
    const response = await this.makeRequest<void>(
      `/events/account/${this.accountId}/events/callbacks/${callbackId}`,
      { method: 'PUT' },
      {
        callback: {
          resend: true
        }
      }
    );
    return response;
  }

  async verifyWebhook(callbackId: string, verifier: string): Promise<void> {
    const response = await this.makeRequest(
      `/events/account/${this.accountId}/events/callbacks/${callbackId}`,
      { method: 'PUT' },
      {
        callback: { 
          verifier
        }
      }
    );
    return response;
  }
}
