/** Geoapify key from Vite (must be prefixed with VITE_). */
export function getGeoapifyKey() {
  return String(import.meta.env.VITE_GEOAPIFY_KEY ?? '').trim()
}

let didLog = false

/**
 * Dev-only: logs why city search may be disabled. Never logs the full API key.
 * @param {string} [context]
 */
export function logGeoapifyEnvDebug(context = 'FanMap Geoapify') {
  if (!import.meta.env.DEV || didLog) return
  didLog = true

  const key = getGeoapifyKey()
  const env = import.meta.env
  const raw = env.VITE_GEOAPIFY_KEY

  console.info(`[${context}] env check`, {
    mode: env.MODE,
    dev: env.DEV,
    /** Length after trim — 0 means missing in the client bundle */
    keyLength: key.length,
    rawType: typeof raw,
    /** In Vite client builds, missing vars are undefined */
    rawIsDefined: raw !== undefined,
    hint:
      key.length === 0
        ? 'Put VITE_GEOAPIFY_KEY in project-root .env, save, then restart `npm run dev` (Vite only reads env at server start).'
        : 'Key present; if requests fail, check Geoapify quota/dashboard.',
  })
}
