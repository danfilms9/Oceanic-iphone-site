import { useState, useEffect } from 'react';
import { fetchShopifyProducts } from '../services/shopifyService';
import { isNorthAmericaTourShirt, type MerchProduct } from '../types/merch';

/**
 * Returns merch products from Shopify. Empty when not connected or on error.
 */
export function useMerchProducts() {
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const fetched = await fetchShopifyProducts();
        const prioritized = [...fetched].sort((a, b) => {
          const aIsTourShirt = isNorthAmericaTourShirt(a);
          const bIsTourShirt = isNorthAmericaTourShirt(b);
          if (aIsTourShirt === bIsTourShirt) return 0;
          return aIsTourShirt ? -1 : 1;
        });
        setProducts(prioritized);
        setError(fetched.length === 0 ? "Items didn't load. Please refresh." : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { products, loading, error };
}
