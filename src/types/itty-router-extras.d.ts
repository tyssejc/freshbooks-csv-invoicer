declare module 'itty-router-extras' {
  export function error(status: number, body?: any): Response;
  export function json(body: any, init?: ResponseInit): Response;
  export function status(code: number, message?: string): Response;
  export function withContent(): (request: Request) => Promise<Request>;
  export function withParams(): (request: Request) => Promise<Request>;
}
