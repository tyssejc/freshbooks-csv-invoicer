# Development Journal

## 2025-02-07

### Day 1
Started by chatting with Claude about solutions. When it got to a certain point, I copied the artifact into Windsurf and asked for a task prompt. Windsurf picked it up pretty quickly.

#### Core Logic
- Implemented FreshBooks OAuth
  - Implemented token refresh logic
- Created Cloudflare Tunnel for local Cloudflare Workers development (first anonymous, then qnex7245.ctysse.net)
- Created FreshBooks API client
- Started working on /list-invoices endpoint (needs UI)

#### Tests
- Added integration tests for the complete OAuth flow
- Fixed type issues in `token-manager.test.ts` related to mocking the `CREDENTIALS` object using `jest-mock-fetch` npm package
- Created proper KV store interface for testing that matches the runtime types
- Utilized Jest's `Mocked` utility type for better type safety in tests
- All tests are passing with proper type checking
- Established test readability and maintainability
- Established separation of concerns between production and test code

### Lessons Learned
1. Cloudflare is awesome
  a. Can host whole mini-apps using Cloudflare Workers
  b. Can use tunnels for local https (useful because FreshBooks requires https for redirect URI) sorta like ngrok
2. Testing - when mocking `fetch`, use `jest-mock-fetch` npm package as trying to do it manually is a PITA
3. Concurrently - a great tool for running multiple processes in parallel

### Code Organization
- Established file structure (lib for shared/reusable code, test for testing, types for type definitions)

## 2025-04-22

Started to realize that Freshbooks provides a webhook API and that I don't need to rebuild the entire invoice creation flow, I can just create a webhook and use the data from that to generate a CSV

### Webhook Implementation
- Completely redesigned the application to use a webhook-based approach
- Removed UI components as they're no longer needed
- Created webhook verification system to validate incoming requests
- Added webhook registration and verification endpoints
- Enhanced FreshBooks client with webhook-related methods
- First attempt at CSV generation logic for Kforce's required format
- Updated environment variables to support webhook configuration

### Challenges Overcome
- FreshBooks webhook verification process was poorly documented
- Verification requires handling form data (not JSON) in the `/webhooks/ready` endpoint (which expects JSON otherwise)
- Had to create custom endpoints to register webhooks and resend verification codes
- Needed to hardcode callback ID after registration for verification to work

### Lessons Learned
1. Webhook verification often involves undocumented steps
2. Always implement proper request content type checking
3. API providers sometimes use different formats for verification vs. actual webhook events
4. Logging is essential when debugging webhook interactions
