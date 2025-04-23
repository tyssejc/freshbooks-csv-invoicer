export interface Env {
  FRESHBOOKS_CLIENT_ID: string;
  FRESHBOOKS_CLIENT_SECRET: string;
  FRESHBOOKS_ACCOUNT_ID: string;
  FRESHBOOKS_WEBHOOK_URL: string;
  FRESHBOOKS_WEBHOOK_SECRET: string;
  OAUTH_REDIRECT_URI: string;
  
  // Kforce specific configuration
  KFORCE_CUSTOMER_ID: string;
  
  // Vendor information for CSV generation
  VENDOR_INFO_VENDOR_ID: string;
  VENDOR_INFO_VENDOR_NAME: string;
  VENDOR_INFO_ADDRESS: string;
  VENDOR_INFO_CITY: string;
  VENDOR_INFO_STATE: string;
  VENDOR_INFO_ZIP: string;
  VENDOR_INFO_CONSULTANT_ID: string;
  VENDOR_INFO_CONSULTANT_NAME: string;
  VENDOR_INFO_CONTACT_NAME: string;
  VENDOR_INFO_PHONE: string;
  VENDOR_INFO_EMAIL: string;
  
  // Email configuration
  CLIENT_EMAIL: string;
  SENDER_EMAIL: string;
  EMAIL_API_KEY?: string;
  
  // KV namespace for storing OAuth tokens
  CREDENTIALS: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}
