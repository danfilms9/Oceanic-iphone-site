# Shopify integration for the Merch app

This guide walks you through connecting the Merch app to Shopify so you can pull products (and prices) dynamically, then add cart and checkout.

---

## How Shopify fits in

- **Storefront API** – Public API for your storefront: read products, create/update carts, get checkout URLs. Uses **GraphQL** and a **Storefront API access token** (meant for front-end or a backend proxy).
- **Admin API** – For managing the store (products, orders, etc.). Not needed for the Merch app; we only need the Storefront API.

**Flow:**

1. **Products** – Your backend (or frontend) calls Shopify’s Storefront API with the token; you get product list + prices. The Merch app already calls `/api/shopify/products` (proxied through your server so the token stays in `.env`).
2. **Cart** – “Add to cart” uses the Storefront API:
   - **cartCreate** – Create a cart (optional: with initial lines). Response includes `cart.id` and `cart.checkoutUrl`.
   - **cartLinesAdd** – Add line items (by product variant ID and quantity).
   - Store the **cart ID** (e.g. in `localStorage` or app state) so you can add more items or send the user to `checkoutUrl`.
3. **Checkout** – You don’t build a checkout UI. When the user is done, open `cart.checkoutUrl` in the browser; Shopify’s hosted checkout runs there (payment, address, etc.).

So: **products and cart** = your app + Storefront API; **payment and fulfillment** = Shopify’s checkout page.

---

## Phase 1: Get products (and prices) from Shopify

Official docs: [Building with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api) · [Getting started](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started)

### 1. Store and Storefront API token (Headless channel)

Use the **Headless channel** in your **store admin** (not the Dev Dashboard). The channel gives you public and **private** access tokens; we use the **private** token on the server.

1. **Open your store admin**  
   Log into **Shopify Admin** for the store that has your products (e.g. Oceanic Collections).

2. **Install the Headless channel**  
   - Go to the [Headless app on the Shopify App Store](https://apps.shopify.com/headless) and install it, **or** in admin use the search and add the **Headless** sales channel.  
   - After install, click **Create storefront** to create your first storefront.  
   - Shopify generates **public** and **private** access tokens. **Copy and save the private access token**—you’ll use it in `.env`. (If you don’t save it, you can rotate a new one later under Headless → your storefront.)

3. **Set Storefront API permissions**  
   - In admin: **Sales channels** → **Headless** → select your storefront.  
   - Beside **Storefront API permissions**, click **Edit**.  
   - Enable the permissions you need (e.g. read product listings; add checkout/cart permissions when you implement Phase 2).  
   - Click **Save**.

4. **Store domain**  
   Your store domain is `your-store.myshopify.com` (e.g. `oceanic-collections.myshopify.com`). Find it in the admin URL or under **Settings → Domains**.

### 2. Configure the project

In **server-example/.env** add:

```env
# Shopify Storefront API (Merch app)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here
```

- Do **not** commit the token; keep it only in `.env` and use the server to proxy all Shopify requests.

### 3. Run the server and test

- Start the backend: `cd server-example && npm start`.
- Open the app and go to the Merch app; the list/grid should load products from Shopify.
- If nothing appears, check the server logs and that products exist and are published to the “Online Store” (or your app’s) sales channel.

### 4. Troubleshooting: 401 Unauthorized

If the server logs show **Shopify response status: 401** and "returning 0 products", Shopify is rejecting your token. Use the token from the **Headless channel**, not from a custom app:

1. In **Shopify Admin** go to **Sales channels** → **Headless**.
2. Open your storefront (or click **Create storefront** if you haven’t yet).
3. In **Manage API access** (or **Storefront API**), find the **private access token**.
4. Copy that **private** token (starts with `shpat_...`) and set it in `server-example/.env` as `SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
5. Restart the API server.

Tokens from **Settings → Develop apps → [App] → Storefront API** are for that custom app. If your storefront is the **Headless** channel, the Headless channel’s token is the one that will work.

---

## Phase 2: Add to cart and cart view

### 1. Cart ID storage

- When you create a cart with **cartCreate**, Shopify returns a **cart ID** (e.g. `gid://shopify/Cart/abc123...`).
- Store this in **localStorage** (e.g. `merch_cart_id`) or in app state so you can:
  - Add more items with **cartLinesAdd**.
  - Fetch cart with **cart** query to show “Cart” view (line items, quantities, subtotal).
  - When the user taps “Checkout”, open `cart.checkoutUrl` in a new tab/window.

### 2. Add to cart mutation

- **cartCreate** input: `{ lines: [ { merchandiseId: variantId, quantity: 1 } ] }`.  
  Use the **variant** GID (from the product’s first variant), not the product GID.
- **cartLinesAdd** input: `{ cartId, lines: [ { merchandiseId, quantity } ] }`.
- Flow:
  - If no cart ID in localStorage → call **cartCreate** with the first line → save returned `cart.id` → optionally redirect to checkout or stay on product/cart.
  - If cart ID exists → call **cartLinesAdd** with that `cartId` and the new line.

### 3. Cart view in the Merch app

- Add a “Cart” entry (e.g. in the title bar or dock).
- When opened, call **cart** query with the stored `cartId` to get:
  - `cart.lines.edges[].node` (title, quantity, variant, image, price).
  - `cart.cost.subtotalAmount`, `cart.checkoutUrl`.
- Render a list of line items and a “Checkout” button that opens `cart.checkoutUrl`.

### 4. Backend routes (recommended)

To keep the Storefront token and cart logic on the server:

- `POST /api/shopify/cart` – Body: `{ variantId, quantity }` or `{ cartId, variantId, quantity }`. Server runs cartCreate or cartLinesAdd and returns `{ cartId, checkoutUrl }` (and optionally full cart).
- `GET /api/shopify/cart?cartId=...` – Returns cart by ID (cart query) for the Cart view.

Frontend then: on “Add to cart” calls `POST /api/shopify/cart`; on “Cart” view calls `GET /api/shopify/cart?cartId=...` and shows line items + “Checkout” linking to `checkoutUrl`.

---

## Summary

| Goal              | How                                                                 |
|-------------------|---------------------------------------------------------------------|
| Show products     | Storefront API `products` query → `/api/shopify/products` (done)   |
| Show price        | From product’s first variant `price` (done)                       |
| Add to cart       | Storefront API `cartCreate` / `cartLinesAdd` (variant ID + qty)    |
| Cart view         | Storefront API `cart` query with stored cart ID                    |
| Checkout / pay    | Open `cart.checkoutUrl` in browser (Shopify hosted checkout)       |

After Phase 1 (products + prices) works, Phase 2 is: store cart ID, add backend cart routes, “Add to cart” button, and a Cart screen that uses the cart query and checkout URL.
