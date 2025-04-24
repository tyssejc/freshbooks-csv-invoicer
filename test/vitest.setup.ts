import { Crypto } from '@peculiar/webcrypto';
import { vi } from 'vitest';

// Mock Response if it doesn't exist (Node.js environment)
if (typeof Response === 'undefined') {
  (global as any).Response = class Response {
    ok: boolean;
    status: number;
    statusText: string;
    headers: Headers;
    body: any;

    constructor(body?: any, init: ResponseInit = {}) {
      this.ok = init.status ? init.status >= 200 && init.status < 300 : true;
      this.status = init.status || 200;
      this.statusText = init.statusText || '';
      this.headers = new Headers(init.headers);
      this.body = body;
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }
  };
}

// Mock Headers if it doesn't exist
if (typeof Headers === 'undefined') {
  (global as any).Headers = class Headers {
    private headers: Map<string, string>;

    constructor(init?: Record<string, string>) {
      this.headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }

    append(name: string, value: string): void {
      this.headers.set(name.toLowerCase(), value);
    }

    delete(name: string): void {
      this.headers.delete(name.toLowerCase());
    }

    get(name: string): string | null {
      return this.headers.get(name.toLowerCase()) || null;
    }

    has(name: string): boolean {
      return this.headers.has(name.toLowerCase());
    }

    set(name: string, value: string): void {
      this.headers.set(name.toLowerCase(), value);
    }
  };
}

// Mock fetch
global.fetch = vi.fn();

// Mock crypto
if (typeof crypto === 'undefined') {
  (global as any).crypto = new Crypto();
}

// Mock btoa
if (typeof btoa === 'undefined') {
  (global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
