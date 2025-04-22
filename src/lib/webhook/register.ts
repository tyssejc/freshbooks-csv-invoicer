import { TokenManager } from '@/lib/token';
import { Env } from '@/types/env';
import { FreshBooksClient } from '@/lib/freshbooks';

export async function registerWebhook(env: Env): Promise<void> {
  const client = await TokenManager.getInstance().getAuthenticatedClient(env);
  try {
    const response = await client.makeRequest(
      `/events/account/${env.FRESHBOOKS_ACCOUNT_ID}/events/callbacks`,
      {
        method: 'POST',
      },
      {
        callback: {
          uri: `${env.FRESHBOOKS_WEBHOOK_URL}/webhooks/ready`,
          event: 'invoice.create'
        }
      }
    );
    return response;
  } catch (error) {
    console.error('Error registering webhook:', error);
    throw error;
  }
}