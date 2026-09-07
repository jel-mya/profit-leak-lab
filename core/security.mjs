export function contentSecurityPolicy(nonce, origin = null) {
  if (!/^[A-Za-z0-9+/=]{16,}$/.test(nonce)) throw new Error('Invalid CSP nonce');
  if (origin !== null && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(origin)) throw new Error('Invalid connection origin');
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'${origin ? ' ' + origin : ''}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
}
export function secureResponse(response, options = {}) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'DENY');
  if ((headers.get('Content-Type') ?? '').includes('text/html')) {
    headers.set('Cache-Control', 'no-store');
    headers.set('Content-Security-Policy', contentSecurityPolicy(options.nonce ?? btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18)))), options.origin ?? null));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
