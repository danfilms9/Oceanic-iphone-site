const CART_ID_KEY = 'merch_cart_id';

export interface CartLine {
  id: string;
  quantity: number;
  title: string;
  variantTitle?: string;
  imageUrl: string | null;
  price: string;
  /** Shopify product GID for linking to product page */
  productId?: string | null;
}

export interface CartResponse {
  cartId: string;
  checkoutUrl: string;
  lines: CartLine[];
  subtotal: string;
}

export function getStoredCartId(): string | null {
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
}

export function setStoredCartId(cartId: string): void {
  try {
    localStorage.setItem(CART_ID_KEY, cartId);
  } catch {
    // ignore
  }
}

/**
 * Add item to cart. Creates cart if no cartId. Returns new cartId and checkoutUrl.
 */
export async function addToCart(params: {
  cartId: string | null;
  variantId: string;
  quantity?: number;
}): Promise<{ cartId: string; checkoutUrl: string }> {
  const { cartId, variantId, quantity = 1 } = params;
  const body = cartId
    ? { cartId, variantId, quantity }
    : { variantId, quantity };
  const response = await fetch('/api/shopify/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to add to cart');
  }
  const data = await response.json();
  setStoredCartId(data.cartId);
  return { cartId: data.cartId, checkoutUrl: data.checkoutUrl };
}

/**
 * Fetch cart by ID for Cart view.
 */
export async function getCart(cartId: string): Promise<CartResponse | null> {
  const response = await fetch(`/api/shopify/cart?cartId=${encodeURIComponent(cartId)}`);
  if (!response.ok) return null;
  return response.json();
}

/**
 * Remove line(s) from cart. Returns updated cartId and checkoutUrl.
 */
export async function removeFromCart(params: {
  cartId: string;
  lineIds: string[];
}): Promise<{ cartId: string; checkoutUrl: string }> {
  const { cartId, lineIds } = params;
  const response = await fetch('/api/shopify/cart/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, lineIds }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to remove from cart');
  }
  const data = await response.json();
  return { cartId: data.cartId, checkoutUrl: data.checkoutUrl };
}

/**
 * Update line quantity. Returns updated cartId and checkoutUrl.
 */
export async function updateCartLineQuantity(params: {
  cartId: string;
  lineId: string;
  quantity: number;
}): Promise<{ cartId: string; checkoutUrl: string }> {
  const { cartId, lineId, quantity } = params;
  const response = await fetch('/api/shopify/cart/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, lines: [{ id: lineId, quantity }] }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to update quantity');
  }
  const data = await response.json();
  return { cartId: data.cartId, checkoutUrl: data.checkoutUrl };
}
