/**
 * Verifies that a webhook request came from FreshBooks
 * 
 * @param request The incoming webhook request
 * @param env Environment variables containing the webhook secret
 * @returns True if the signature is valid, false otherwise
 */
export async function verifyWebhookSignature(request: Request, env: Env): Promise<boolean> {
  try {
    // Get the signature from the headers
    const signature = request.headers.get('X-FreshBooks-Hmac-SHA256');
    if (!signature) {
      console.error('No signature found in webhook request');
      return false;
    }

    // Get the webhook secret
    const secret = env.CREDENTIALS.get('freshbooks_webhook_secret');
    if (!secret) {
      console.error('No webhook secret configured');
      return false;
    }

    // Clone the request and get the body as text
    const clonedRequest = request.clone();
    const body = await clonedRequest.text();
    
    // Create a TextEncoder to convert the string to Uint8Array
    const encoder = new TextEncoder();
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    
    // Sign the body
    const signedData = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );
    
    // Convert the signed data to base64
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signedData)));
    
    // Compare the signatures
    return signature === signatureBase64;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
