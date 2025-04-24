import { FreshBooksClient } from '@/lib/freshbooks';
import {
  FreshBooksApiError,
  FreshBooksAuthError,
  FreshBooksRateLimitError,
  FreshBooksInvoice
} from '@/types/freshbooks';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import mockFetchResponse from './utils/mock-fetch-response';

describe('FreshBooksClient', () => {
  let client: FreshBooksClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new FreshBooksClient('test-access-token', 'test-account-id');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listInvoices', () => {
    it('should fetch invoices successfully', async () => {
      const mockInvoices: Partial<FreshBooksInvoice>[] = [
        { id: '1', invoice_number: 'INV-001' },
        { id: '2', invoice_number: 'INV-002' }
      ];

      const mockFetch = mockFetchResponse({
        response: {
          result: {
            invoices: mockInvoices
          }
        }
      });

      const invoices = await client.listInvoices();
      expect(invoices).toHaveLength(2);
      expect(invoices[0].invoice_number).toBe('INV-001');
      expect(invoices[1].invoice_number).toBe('INV-002');

      // Verify the request
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.freshbooks.com/accounting/account/test-account-id/invoices/invoices');
      expect(options).toMatchObject({
        headers: {
          'Authorization': 'Bearer test-access-token',
          'Content-Type': 'application/json',
          'Api-Version': '2023-11-01'
        }
      });
    });

    it('should handle rate limiting', async () => {
      const mockFetch = mockFetchResponse(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: {
            'Retry-After': '30'
          }
        }
      );

      await expect(client.listInvoices())
        .rejects
        .toThrow(FreshBooksRateLimitError);
    });

    it('should handle authentication errors', async () => {
      const mockFetch = mockFetchResponse(
        { error: 'unauthorized' },
        { status: 401 }
      );

      await expect(client.listInvoices())
        .rejects
        .toThrow(FreshBooksAuthError);
    });
  });

  describe('getInvoice', () => {
    it('should fetch a single invoice successfully', async () => {
      const mockInvoice: Partial<FreshBooksInvoice> = {
        id: '1',
        invoice_number: 'INV-001'
      };

      const mockFetch = mockFetchResponse({
        response: {
          result: {
            invoice: mockInvoice
          }
        }
      });

      const invoice = await client.getInvoice('1');
      expect(invoice.invoice_number).toBe('INV-001');

      // Verify the request
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.freshbooks.com/accounting/account/test-account-id/invoices/invoices/1');
      expect(options).toMatchObject({
        headers: {
          'Authorization': 'Bearer test-access-token',
          'Content-Type': 'application/json',
          'Api-Version': '2023-11-01'
        }
      });
    });
  });
});
