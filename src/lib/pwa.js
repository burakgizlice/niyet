// Block 15: PWA install + offline helpers.
//
// Service-worker registration is handled by vite-plugin-pwa (injectRegister:
// 'auto'); this module only owns the install-prompt lifecycle and a network-
// first read helper that Block 16 (Supabase) will hang its reads on. State is
// kept in module scope, not React state — the beforeinstallprompt event fires
// once, early, and any UI affordance reads these synchronously.

/**
 * Holds the deferred BeforeInstallPromptEvent so a custom "Ana ekrana ekle"
 * affordance can trigger it later. null until the browser fires the event
 * (Chrome/Edge/Android only — never on iOS Safari or Firefox).
 * @type {{ current: Event | null }}
 */
export const installPromptRef = { current: null }

/**
 * Attach the install lifecycle listeners. Call once at app boot, before React
 * mounts — the browser fires beforeinstallprompt shortly after load and it must
 * be captured in the same tick or it is lost. preventDefault() stops Chrome's
 * default mini-infobar so we control when the prompt shows.
 */
export function initPWA() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPromptRef.current = e
  })
  window.addEventListener('appinstalled', () => {
    installPromptRef.current = null
  })
}

/** @returns {boolean} true when a captured prompt is available to trigger. */
export function isInstallable() {
  return Boolean(installPromptRef.current)
}

/**
 * Show the native install prompt and await the user's choice. Single-use: the
 * captured event cannot be re-prompted, so the ref is cleared either way.
 * @returns {Promise<'accepted' | 'dismissed' | 'unavailable'>}
 */
export async function triggerInstall() {
  const prompt = installPromptRef.current
  if (!prompt) return 'unavailable'
  prompt.prompt()
  const { outcome } = await prompt.userChoice
  installPromptRef.current = null
  return outcome
}

/** @returns {boolean} true when running as an installed standalone app. */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * Block 16 hook point. Try the network via fetchFn and cache the result in
 * localStorage under `key`; on any failure (offline, error) fall back to the
 * last cached value. Returns null when there is neither network nor cache.
 * @template T
 * @param {string} key localStorage key for the cached payload
 * @param {() => Promise<T>} fetchFn the network read to attempt
 * @returns {Promise<T | null>}
 */
export async function networkFirstWithLocalStorageFallback(key, fetchFn) {
  try {
    const result = await fetchFn()
    try {
      localStorage.setItem(key, JSON.stringify(result))
    } catch {
      // Quota/serialisation failure must not fail the read — return the fresh
      // network result regardless of whether the cache write succeeded.
    }
    return result
  } catch {
    try {
      const cached = localStorage.getItem(key)
      return cached === null ? null : JSON.parse(cached)
    } catch {
      return null
    }
  }
}
