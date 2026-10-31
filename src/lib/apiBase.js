// Which API this portal talks to. Opened on a staging address (…-staging.payport.africa) it always uses the
// staging API, whatever the build was given, so a staging site never calls the live one.
const staging = typeof window !== 'undefined' && /-staging\./.test(window.location.hostname);

export const API_BASE = (staging ? 'https://api-staging.payport.africa'
  : (import.meta.env.VITE_API_URL || 'https://api.payport.africa')).replace(/\/$/, '');

export const COMMERCE_BASE = (staging ? 'https://store-staging.payport.africa'
  : (import.meta.env.VITE_COMMERCE_URL || 'https://store.payport.africa')).replace(/\/$/, '');
