import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper: run Shopify Storefront GraphQL (mutation or query)
async function shopifyGraphQL(req: VercelRequest, query: string, variables: any = {}) {
  const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
  const accessToken = (process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '').trim();
  if (!storeDomain || !accessToken) {
    return { ok: false, json: {}, status: 500 };
  }
  
  const shopifyUrl = `https://${storeDomain}/api/2024-01/graphql.json`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': accessToken,
  };
  
  const buyerIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  if (buyerIp && typeof buyerIp === 'string') {
    headers['Shopify-Storefront-Buyer-IP'] = buyerIp.split(',')[0].trim();
  }
  
  try {
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    const json = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    return { ok: false, json: {}, status: 500 };
  }
}

// POST /api/shopify/cart/remove – remove line(s) from cart. Body: { cartId, lineIds: [id, ...] }
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cartId, lineIds } = req.body || {};
    if (!cartId || !Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({ error: 'cartId and lineIds (non-empty array) required' });
    }
    
    const mutation = `
      mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart { id checkoutUrl }
          userErrors { message field }
        }
      }
    `;
    
    const { ok, json } = await shopifyGraphQL(req, mutation, { cartId, lineIds });
    if (!ok) {
      return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
    }
    
    const payload = json.data?.cartLinesRemove;
    const userErrors = payload?.userErrors || [];
    if (userErrors.length) {
      return res.status(400).json({ error: userErrors.map((e: any) => e.message).join('; ') });
    }
    
    const cart = payload?.cart;
    if (!cart) {
      return res.status(502).json({ error: 'No cart returned' });
    }
    
    return res.json({ cartId: cart.id, checkoutUrl: cart.checkoutUrl });
  } catch (error: any) {
    console.error('[API] Shopify cart remove error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
