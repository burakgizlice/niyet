// Block 17 (decision C5): the single allowed OAuth / magic-link redirect target.
//
// Hardcoded to the production domain because only it is registered in the
// Supabase redirect allowlist at launch. We deliberately do NOT use
// window.location.origin — that would hand Supabase whatever origin the page
// happens to load from (e.g. an unregistered *.pages.dev preview), which fails
// the allowlist check and, worse, normalises the habit of trusting arbitrary
// origins. When preview-URL auth is prioritised, register *.pages.dev in the
// dashboard and update this constant (or branch on import.meta.env.DEV) here —
// one place.
export const REDIRECT_URL = 'https://niyet.burakgizlice.com'
