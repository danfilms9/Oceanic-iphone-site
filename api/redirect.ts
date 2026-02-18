import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Redirect endpoint to preserve tracking codes when Instagram rewrites URLs
 * Usage: https://www.oceanicofficial.com/api/redirect?ref=675
 * This will redirect to https://www.oceanicofficial.com/?ref=675
 * Instagram is less likely to strip named parameters like ?ref= than standalone ?675
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { ref, track, slug, code, id } = req.query;
  
  // Get the tracking code from any of the supported parameter names
  const trackingCode = (ref || track || slug || code || id) as string | undefined;
  
  if (!trackingCode) {
    // No tracking code provided, redirect to homepage
    return res.redirect(302, '/');
  }
  
  // Redirect to homepage with the tracking code preserved as ?ref parameter
  // This format is more likely to survive Instagram's URL rewriting
  const redirectUrl = `/?ref=${trackingCode}`;
  
  return res.redirect(302, redirectUrl);
}
