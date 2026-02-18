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

// POST /api/shopify/cart – create cart or add line. Body: { cartId?, variantId, quantity }
// GET /api/shopify/cart?cartId=... – get cart for display
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // GET /api/shopify/cart?cartId=... – get cart for display
    try {
      const cartId = (req.query.cartId as string || '').trim();
      if (!cartId) {
        return res.status(400).json({ error: 'cartId required' });
      }
      
      const query = `
        query getCart($cartId: ID!) {
          cart(id: $cartId) {
            id
            checkoutUrl
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      image { url }
                      product { id title }
                      price { amount currencyCode }
                    }
                  }
                }
              }
            }
            cost { subtotalAmount { amount currencyCode } }
          }
        }
      `;
      
      const { ok, json } = await shopifyGraphQL(req, query, { cartId });
      if (!ok) {
        return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
      }
      
      const cart = json.data?.cart;
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
      
      const lines = (cart.lines?.edges || []).map(({ node }: any) => ({
        id: node.id,
        quantity: node.quantity,
        title: node.merchandise?.product?.title ?? node.merchandise?.title ?? 'Item',
        variantTitle: node.merchandise?.title,
        imageUrl: node.merchandise?.image?.url ?? null,
        price: node.merchandise?.price
          ? `${node.merchandise.price.currencyCode} ${Number(node.merchandise.price.amount).toFixed(2)}`
          : '',
        productId: node.merchandise?.product?.id ?? null,
      }));
      
      return res.json({
        cartId: cart.id,
        checkoutUrl: cart.checkoutUrl,
        lines,
        subtotal: cart.cost?.subtotalAmount
          ? `${cart.cost.subtotalAmount.currencyCode} ${Number(cart.cost.subtotalAmount.amount).toFixed(2)}`
          : '',
      });
    } catch (error: any) {
      console.error('[API] Shopify cart get error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    // POST /api/shopify/cart – create cart or add line. Body: { cartId?, variantId, quantity }
    try {
      const { cartId, variantId, quantity = 1 } = req.body || {};
      if (!variantId || typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ error: 'variantId and quantity (>= 1) required' });
      }
      
      const lines = [{ merchandiseId: variantId, quantity }];

      if (cartId) {
        const mutation = `
          mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart { id checkoutUrl }
              userErrors { message field }
            }
          }
        `;
        const { ok, json } = await shopifyGraphQL(req, mutation, { cartId, lines });
        if (!ok) {
          return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
        }
        const payload = json.data?.cartLinesAdd;
        const userErrors = payload?.userErrors || [];
        if (userErrors.length) {
          return res.status(400).json({ error: userErrors.map((e: any) => e.message).join('; ') });
        }
        const cart = payload?.cart;
        if (!cart) {
          return res.status(502).json({ error: 'No cart returned' });
        }
        return res.json({ cartId: cart.id, checkoutUrl: cart.checkoutUrl });
      }

      const mutation = `
        mutation cartCreate($input: CartInput!) {
          cartCreate(input: $input) {
            cart { id checkoutUrl }
            userErrors { message field }
          }
        }
      `;
      const { ok, json } = await shopifyGraphQL(req, mutation, { input: { lines } });
      if (!ok) {
        return res.status(502).json({ error: 'Shopify request failed', details: json.errors });
      }
      const payload = json.data?.cartCreate;
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
      console.error('[API] Shopify cart error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
