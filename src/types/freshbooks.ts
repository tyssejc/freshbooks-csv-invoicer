// FreshBooks API Error Types
export class FreshBooksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FreshBooksError';
  }
}

export class FreshBooksApiError extends FreshBooksError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'FreshBooksApiError';
  }
}

export class FreshBooksAuthError extends FreshBooksError {
  constructor(message: string) {
    super(message);
    this.name = 'FreshBooksAuthError';
  }
}

export class FreshBooksRateLimitError extends FreshBooksError {
  constructor(public retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    this.name = 'FreshBooksRateLimitError';
  }
}

// FreshBooks API Response Types
export interface FreshBooksResponse<T> {
  response: {
    result: {
      [key: string]: T;
    };
  };
}

export interface FreshBooksListResponse<T> extends FreshBooksResponse<T[]> {
  response: {
    result: {
      [key: string]: T[];
    };
    per_page: number;
    page: number;
    pages: number;
    total: number;
  };
}

// FreshBooks Invoice Types
export interface FreshBooksAmount {
  amount: string;
  code: string;
}

export interface FreshBooksLineItem {
  amount: FreshBooksAmount;
  description: string;
  name: string;
  quantity: number;
  rate: FreshBooksAmount;
  taxAmount1: FreshBooksAmount;
  taxAmount2: FreshBooksAmount;
  taxName1: string;
  taxName2: string;
  type: number;
  unit_cost: FreshBooksAmount;
}

export interface FreshBooksInvoice {
  accountid: string;
  accounting_systemid: string;
  amount: FreshBooksAmount;
  auto_bill: boolean;
  city: string;
  code: string;
  create_date: string;
  currency_code: string;
  current_organization: string;
  date_paid?: string;
  description: string;
  discount_description: string;
  discount_total: FreshBooksAmount;
  display_status: string;
  dispute_status: string;
  due_date: string;
  due_offset_days: number;
  email: string;
  estimateid: number;
  ext_archive: number;
  fname: string;
  id: string;
  invoice_number: string;
  language: string;
  last_order_status: string;
  lines: FreshBooksLineItem[];
  lname: string;
  notes: string;
  organization: string;
  outstanding: FreshBooksAmount;
  paid: FreshBooksAmount;
  payment_details: string;
  payment_status: string;
  po_number: string;
  province: string;
  return_uri: string;
  status: number;
  street: string;
  street2: string;
  template: string;
  terms: string;
  updated: string;
  v3_status: string;
  vat_name: string;
  vat_number: string;
}

// FreshBooks Client Types
export interface FreshBooksListInvoicesParams {
  page?: number;
  per_page?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'late' | 'partial';
}
