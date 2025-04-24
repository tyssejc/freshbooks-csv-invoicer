# FreshBooks to Kforce Invoice Converter

A Cloudflare Worker that automatically processes FreshBooks invoices and converts them to Kforce's required CSV format when new invoices are created.

## Features

- Listens for FreshBooks webhook events when invoices are created
- Automatically processes invoices for a specific client (Kforce)
- Generates CSV files according to Kforce's required format
- Attaches the CSV to the original invoice in FreshBooks
- Sends an email with the CSV to the client

## Setup

### Prerequisites

- FreshBooks account with API access
- Cloudflare Workers account
- Wrangler CLI (installed with `bun install`)

### Environment Variables

Copy the `.example.dev.vars` file to `.dev.vars` and fill in the required values:

```bash
cp .example.dev.vars .dev.vars
```

Required environment variables:

- `FRESHBOOKS_CLIENT_ID`: Your FreshBooks OAuth client ID
- `FRESHBOOKS_CLIENT_SECRET`: Your FreshBooks OAuth client secret
- `FRESHBOOKS_ACCOUNT_ID`: Your FreshBooks account ID
- `FRESHBOOKS_WEBHOOK_SECRET`: Secret for verifying webhook signatures
- `OAUTH_REDIRECT_URI`: OAuth callback URL
- `KFORCE_CUSTOMER_ID`: The customer ID for Kforce in your FreshBooks account
- Various vendor information fields for CSV generation
- Email configuration for sending the CSV to the client

### OAuth Setup

1. Register your application in the FreshBooks Developer Portal
2. Set the redirect URI to `https://your-worker-url.workers.dev/oauth/callback`
3. Deploy the worker with `bun run deploy`
4. Visit `https://your-worker-url.workers.dev/oauth/init` to authorize the application

### Webhook Setup

1. In the FreshBooks Developer Portal, register a webhook for the `invoice.create` event
2. Set the callback URL to `https://your-worker-url.workers.dev/webhook`
3. Store the webhook secret in your environment variables

## Development

### Local Development

```bash
bun install
bun run dev
```

### Testing

```bash
bun run test
```

### Deployment

```bash
bun run deploy
```

## How It Works

1. When an invoice is created in FreshBooks, a webhook is triggered
2. The worker verifies the webhook signature
3. If the invoice is for the Kforce client, it processes the invoice
4. The worker generates a CSV file according to Kforce's requirements
5. The CSV is uploaded as an attachment to the invoice in FreshBooks
6. An email with the CSV is sent to the client

## API Endpoints

- `GET /`: Status check
- `GET /oauth/init`: Initiates the OAuth flow
- `GET /oauth/callback`: OAuth callback handler
- `POST /webhook`: Webhook handler for FreshBooks events
- `GET /list-invoices`: Debug endpoint to list recent invoices

## License

MIT
