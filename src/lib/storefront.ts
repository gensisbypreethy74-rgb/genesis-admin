/**
 * The live storefront, for "View Storefront" and the Story preview link. One
 * value for both — they used to disagree (localhost vs the live site) when
 * NEXT_PUBLIC_STOREFRONT_URL was unset. The default is the real public site,
 * never localhost; set the variable to point a local admin at a local storefront.
 */
export const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://genesisbypreethy.com'
)
  .trim()
  .replace(/\/+$/, '');
