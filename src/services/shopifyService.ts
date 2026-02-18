import type { MerchProduct } from '../types/merch';

interface ShopifyProductsResponse {
  products: MerchProduct[];
}

/**
 * Fetches products from the backend, which proxies to Shopify Storefront API.
 * Returns empty array if Shopify is not configured or the request fails.
 */
export async function fetchShopifyProducts(): Promise<MerchProduct[]> {
  try {
    const response = await fetch('/api/shopify/products');
    if (!response.ok) return [];
    const data: ShopifyProductsResponse = await response.json();
    return Array.isArray(data.products) ? data.products : [];
  } catch {
    return [];
  }
}
