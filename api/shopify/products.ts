import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ShopifyProduct {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoIsEmbed?: boolean;
  productMedia?: Array<{
    type: 'image' | 'video';
    url: string;
    videoIsEmbed?: boolean;
  }>;
  variantId?: string | null;
  variants?: Array<{
    id: string;
    price: string;
    selectedOptions?: Array<{ name: string; value: string }>;
  }>;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse<ShopifyProductsResponse | { error: string }>> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const storeDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
    const accessToken = (process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '').trim();

    if (!storeDomain || !accessToken) {
      console.log('[API] Shopify: missing config, returning empty products');
      return res.status(200).json({ products: [] });
    }

    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              description
              featuredImage { url }
              media(first: 20) {
                edges {
                  node {
                    mediaContentType
                    ... on MediaImage {
                      image { url }
                    }
                    ... on Video {
                      sources {
                        url
                        mimeType
                      }
                    }
                    ... on ExternalVideo {
                      embedUrl
                    }
                  }
                }
              }
              variants(first: 25) {
                edges {
                  node {
                    id
                    price {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const apiVersions = ['2024-01', '2023-10'];
    let response: Response | null = null;
    let json: any = {};
    let shopifyUrl: string;
    let lastStatus: number = 0;

    for (const version of apiVersions) {
      shopifyUrl = `https://${storeDomain}/api/${version}/graphql.json`;
      console.log('[API] Shopify: calling', shopifyUrl);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Shopify-Storefront-Private-Token': accessToken,
      };
      
      const buyerIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
      if (buyerIp && typeof buyerIp === 'string') {
        headers['Shopify-Storefront-Buyer-IP'] = buyerIp.split(',')[0].trim();
      }

      try {
        response = await fetch(shopifyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables: { first: 50 } }),
        });
        
        json = await response.json().catch(() => ({}));
        lastStatus = response.status;
        
        console.log('[API] Shopify: response status', response.status, 'data present:', !!json.data, 'errors:', json.errors?.length ?? 0);
        
        if (response.ok && (!json.errors || json.errors.length === 0)) {
          break;
        }
        
        if (response.status !== 404 && response.status !== 422) {
          break;
        }
      } catch (fetchError) {
        console.error('[API] Shopify: fetch error', fetchError);
        break;
      }
    }

    if (!response || !response.ok) {
      const msg = json.errors ? json.errors.map((e: any) => e.message).join('; ') : response?.statusText || 'Unknown error';
      console.error('[API] Shopify: products error', lastStatus, msg);
      if (lastStatus === 401) {
        console.error('[API] Shopify: 401 = Unauthorized. Use the Storefront API *private* token from: Settings > Apps and sales channels > Develop apps > [Your app] > API credentials > Storefront API. Ensure the app is installed on the store.');
      }
      console.log('[API] Shopify: returning 0 products (reason: Shopify responded', lastStatus, ')');
      return res.status(200).json({ products: [] });
    }

    if (json.errors && json.errors.length) {
      console.error('[API] Shopify: GraphQL errors', json.errors);
      console.log('[API] Shopify: returning 0 products (reason: GraphQL errors)');
      return res.status(200).json({ products: [] });
    }

    const edges = json.data?.products?.edges ?? [];
    console.log('[API] Shopify: edges count', edges.length);
    
    if (edges.length === 0) {
      console.log('[API] Shopify: returning 0 products (reason: store has no products or none published to the sales channel)');
    }

    const products: ShopifyProduct[] = edges.map(({ node }: any) => {
      const variantEdges = node.variants?.edges ?? [];
      const variants = variantEdges.map(({ node: v }: any) => ({
        id: v.id,
        price: v.price
          ? `${v.price.currencyCode} ${Number(v.price.amount).toFixed(2)}`
          : '',
        selectedOptions: (v.selectedOptions || []).map((o: any) => ({ name: o.name, value: o.value })),
      }));
      
      const firstVariant = variantEdges[0]?.node;
      const price = firstVariant?.price
        ? `${firstVariant.price.currencyCode} ${Number(firstVariant.price.amount).toFixed(2)}`
        : '';
      
      const mediaEdges = node.media?.edges ?? [];
      const productMedia: Array<{ type: 'image' | 'video'; url: string; videoIsEmbed?: boolean }> = [];
      let imageUrl = node.featuredImage?.url ?? null;
      
      for (const { node: m } of mediaEdges) {
        if (m.mediaContentType === 'VIDEO' && m.sources?.length) {
          productMedia.push({ type: 'video', url: m.sources[0].url, videoIsEmbed: false });
        } else if (m.mediaContentType === 'EXTERNAL_VIDEO' && m.embedUrl) {
          productMedia.push({ type: 'video', url: m.embedUrl, videoIsEmbed: true });
        } else if (m.mediaContentType === 'IMAGE' && m.image?.url) {
          productMedia.push({ type: 'image', url: m.image.url });
          if (!imageUrl) imageUrl = m.image.url;
        }
      }
      
      if (!imageUrl && node.featuredImage?.url) {
        imageUrl = node.featuredImage.url;
      }
      
      const firstVideo = productMedia.find((s) => s.type === 'video');
      
      return {
        id: node.id,
        name: node.title,
        description: node.description ?? null,
        price,
        imageUrl,
        videoUrl: firstVideo ? firstVideo.url : null,
        videoIsEmbed: firstVideo ? !!firstVideo.videoIsEmbed : undefined,
        productMedia: productMedia.length > 0 ? productMedia : undefined,
        variantId: firstVariant?.id ?? null,
        variants: variants.length > 0 ? variants : undefined,
      };
    });

    console.log('[API] Shopify: products', products.length, 'loaded for', storeDomain);
    return res.status(200).json({ products });
  } catch (error: any) {
    console.error('[API] Shopify: products error', error.message);
    console.log('[API] Shopify: returning 0 products (reason: exception)', error.message);
    return res.status(200).json({ products: [] });
  }
}
