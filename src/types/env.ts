export interface Env {
  FRESHBOOKS_CLIENT_ID: string;
  FRESHBOOKS_CLIENT_SECRET: string;
  FRESHBOOKS_ACCOUNT_ID: string;
  OAUTH_REDIRECT_URI: string;
  VENDOR_ID: string;
  VENDOR_NAME: string;
  VENDOR_ADDRESS: string;
  VENDOR_CITY: string;
  VENDOR_STATE: string;
  VENDOR_ZIP: string;
  VENDOR_PHONE: string;
  VENDOR_EMAIL: string;
  VENDOR_CONTACT: string;
  CONSULTANT_ID: string;
  CONSULTANT_NAME: string;
  CREDENTIALS: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}
