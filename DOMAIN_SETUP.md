# Connecting Your Squarespace Domain to Vercel

This guide will help you connect your Squarespace-bought domain to your Vercel deployment.

## Overview

Your domain is currently pointing to Squarespace. To connect it to Vercel, you need to:
1. Add your domain in Vercel
2. Update DNS records to point to Vercel instead of Squarespace
3. Wait for DNS propagation

## Step 1: Add Domain in Vercel

1. **Go to your Vercel project:**
   - Navigate to https://vercel.com/dashboard
   - Click on your project: `oceanic-iphone-site`

2. **Open Domain Settings:**
   - Click on **Settings** → **Domains** (in the left sidebar)
   - Or click on the **"Assigning Custom Domains"** section from your deployment page

3. **Add your domain:**
   - Click **"Add Existing"** button (top right of the Domains page)
   - In the modal that appears, you'll see an input field with placeholder text "example.com"
   - **Type your Squarespace domain** in that field (e.g., `yourdomain.com`)
   - Make sure "Connect to an environment" is selected and "Production" is chosen
   - Click **"Save"**

4. **Vercel will show you DNS configuration:**
   - Vercel will display the DNS records you need to add
   - You'll typically see:
     - **A record** for `@` (root domain) pointing to Vercel's IP addresses
     - **CNAME record** for `www` pointing to `cname.vercel-dns.com` or similar
   - **Important:** Copy these DNS records - you'll need them in the next step

## Step 2: Update DNS Records

Since your Squarespace DNS page shows "You're using custom nameservers," you have two options:

### Option A: Update DNS at Your Current Nameserver Provider (Recommended)

If you want to keep your current nameserver setup:

1. **Find your nameserver provider:**
   - Check where your nameservers are pointing (they're not Squarespace)
   - Common providers: GoDaddy, Namecheap, Cloudflare, Google Domains, etc.

2. **Log into your nameserver provider's DNS management:**
   - Navigate to DNS settings for your domain

3. **Update the DNS records:**
   - **Remove or update the Squarespace A records:**
     - Delete the four A records pointing to Squarespace IPs:
       - `198.49.23.144`
       - `198.49.23.145`
       - `198.185.159.145`
       - `198.185.159.144`
   
   - **Add Vercel's A record for root domain:**
     - Type: `A`
     - Host/Name: `@` (or leave blank, depending on provider)
     - Value: The IP address provided by Vercel (usually `76.76.21.21` or similar)
     - TTL: `3600` or use default
   
   - **Update the www CNAME:**
     - Remove the existing CNAME: `www` → `ext-sq.squarespace.com`
     - Add new CNAME: `www` → `cname.vercel-dns.com` (or what Vercel specifies)
   
   - **Keep your Google Workspace records:**
     - **DO NOT DELETE** the MX records for Google Workspace (email)
     - **DO NOT DELETE** the Google verification TXT record
     - These are needed for your email to continue working

### Option B: Switch to Squarespace Nameservers

If you prefer to manage DNS in Squarespace:

1. **Get Squarespace nameservers:**
   - In Squarespace, go to Settings → Domains → Advanced DNS Settings
   - Note the nameserver addresses (usually something like `ns1.squarespace.com`)

2. **Update nameservers at your domain registrar:**
   - Log into where you bought the domain (might be Squarespace or another registrar)
   - Find "Nameservers" or "DNS" settings
   - Change from custom nameservers to Squarespace nameservers
   - Wait 24-48 hours for propagation

3. **Once nameservers are switched:**
   - Go back to Squarespace DNS settings
   - The warning about custom nameservers should disappear
   - Click **"ADD RECORD"** in the Custom records section
   - Add the A and CNAME records provided by Vercel
   - Remove or update the existing Squarespace A records

## Step 3: Verify Configuration in Vercel

1. **Check domain status in Vercel:**
   - Go back to Vercel → Your Project → Settings → Domains
   - You should see your domain listed
   - Status will show:
     - **"Valid Configuration"** - DNS is correct ✅
     - **"Invalid Configuration"** - DNS needs updating ⚠️
     - **"Pending"** - Waiting for DNS propagation ⏳

2. **Wait for DNS propagation:**
   - DNS changes can take 24-48 hours to fully propagate
   - Usually works within 1-2 hours
   - You can check propagation status at: https://www.whatsmydns.net

## Step 4: Test Your Domain

Once DNS has propagated:

1. **Visit your domain:**
   - Go to `http://yourdomain.com` and `http://www.yourdomain.com`
   - Both should show your Vercel deployment

2. **Check SSL certificate:**
   - Vercel automatically provisions SSL certificates
   - After DNS propagates, `https://yourdomain.com` should work
   - This usually takes a few minutes after DNS is configured

## Important Notes

### Preserving Email (Google Workspace)

⚠️ **CRITICAL:** Make sure to keep these DNS records:
- All **MX records** for Google Workspace
- The **TXT record** for Google verification

If you delete these, your email will stop working!

### DNS Record Priority

When adding records:
- **A record** for `@` (root domain) - points `yourdomain.com` to Vercel
- **CNAME record** for `www` - points `www.yourdomain.com` to Vercel
- **MX records** - keep existing for email
- **TXT records** - keep existing for verification

### Troubleshooting

**Domain not working after 24 hours:**
- Double-check DNS records match exactly what Vercel provided
- Verify nameservers are correct
- Check DNS propagation: https://www.whatsmydns.net

**SSL certificate not working:**
- Wait a few hours after DNS propagates
- Vercel automatically provisions SSL, but it takes time
- Check Vercel dashboard for SSL status

**Email not working:**
- Verify MX records are still present
- Check Google Workspace admin console
- DNS changes shouldn't affect email if MX records are preserved

## Quick Reference: Common DNS Providers

- **GoDaddy:** My Products → Domains → DNS
- **Namecheap:** Domain List → Manage → Advanced DNS
- **Cloudflare:** DNS → Records
- **Google Domains:** DNS → Custom records

## Need Help?

- Vercel DNS Docs: https://vercel.com/docs/concepts/projects/domains
- Check your domain status in Vercel dashboard
- Vercel support: support@vercel.com
