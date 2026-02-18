import { useState, useEffect, useCallback } from 'react';
import {
  getStoredCartId,
  setStoredCartId,
  addToCart as addToCartApi,
  getCart,
  removeFromCart as removeFromCartApi,
  updateCartLineQuantity as updateCartLineQuantityApi,
  type CartResponse,
} from '../services/shopifyCartService';

export function useMerchCart() {
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCartId(getStoredCartId());
  }, []);

  useEffect(() => {
    if (!cartId) {
      setCart(null);
      return;
    }
    let cancelled = false;
    getCart(cartId).then((data) => {
      if (!cancelled) setCart(data ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [cartId]);

  const addToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      setLoading(true);
      setError(null);
      try {
        const currentId = cartId ?? getStoredCartId();
        const { cartId: newId } = await addToCartApi({
          cartId: currentId,
          variantId,
          quantity,
        });
        setCartId(newId);
        setStoredCartId(newId);
        const updated = await getCart(newId);
        setCart(updated ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add to cart');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cartId]
  );

  const lineCount = cart?.lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0;

  const [removingLineId, setRemovingLineId] = useState<string | null>(null);

  const removeFromCart = useCallback(
    async (lineId: string) => {
      if (!cartId) return;
      setRemovingLineId(lineId);
      setError(null);
      try {
        await removeFromCartApi({ cartId, lineIds: [lineId] });
        const updated = await getCart(cartId);
        setCart(updated ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove item');
      } finally {
        setRemovingLineId(null);
      }
    },
    [cartId]
  );

  const [updatingLineId, setUpdatingLineId] = useState<string | null>(null);

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cartId || quantity < 1) return;
      setUpdatingLineId(lineId);
      setError(null);
      try {
        await updateCartLineQuantityApi({ cartId, lineId, quantity });
        const updated = await getCart(cartId);
        setCart(updated ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update quantity');
      } finally {
        setUpdatingLineId(null);
      }
    },
    [cartId]
  );

  return { cartId, cart, addToCart, removeFromCart, updateQuantity, loading, error, lineCount, removingLineId, updatingLineId };
}
