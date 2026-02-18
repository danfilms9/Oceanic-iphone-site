/** Option selected for a variant (e.g. Size: S) */
export interface MerchVariantOption {
  name: string;
  value: string;
}

/** Product variant with id, price, and option values (e.g. Size) */
export interface MerchProductVariant {
  id: string;
  price: string;
  selectedOptions?: MerchVariantOption[];
}

/** One slide in the product media carousel (video or image) from Shopify */
export interface MerchProductMediaItem {
  type: 'video' | 'image';
  url: string;
  /** Only for type 'video': if true, url is an embed URL (e.g. iframe) */
  videoIsEmbed?: boolean;
}

/**
 * Merch product. Can come from test data (imageFileName) or Shopify (imageUrl, variantId, variants, productMedia).
 */
export interface MerchProduct {
  id: string;
  name: string;
  /** Product description from Shopify (plain text) */
  description?: string | null;
  /** Display price; e.g. "$24.00" or "USD 24.00" (often first variant's price) */
  price: string;
  /** Local filename under /assets/merchapp/ (test data) */
  imageFileName?: string;
  /** Full image URL from Shopify (when using Storefront API); used for list/grid thumb */
  imageUrl?: string | null;
  /** Product video URL (direct file URL or embed URL from Shopify media) */
  videoUrl?: string | null;
  /** If true, videoUrl is an embed URL (e.g. YouTube) and should be shown in an iframe */
  videoIsEmbed?: boolean;
  /** Ordered media for product page carousel (video + images from Shopify) */
  productMedia?: MerchProductMediaItem[];
  /** Shopify variant GID for add-to-cart (first variant if no selection) */
  variantId?: string | null;
  /** All variants for size/option selection (Shopify) */
  variants?: MerchProductVariant[];
}

/** Get the value for an option (e.g. "Size") from a variant's selectedOptions */
export function getVariantOptionValue(variant: MerchProductVariant, optionName: string): string | null {
  const opt = variant.selectedOptions?.find((o) => o.name === optionName);
  return opt?.value ?? null;
}

/** Resolve product image source: Shopify URL or local path. Returns undefined when no image. */
export function getMerchProductImageUrl(product: MerchProduct): string | undefined {
  if (product.imageUrl) return product.imageUrl;
  if (product.imageFileName) return `/assets/merchapp/${encodeURIComponent(product.imageFileName)}`;
  return undefined;
}
