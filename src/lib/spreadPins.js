/** @typedef {{ id: string, city: string, country: string, lat: number, lng: number }} PinRecord */

/** @typedef {PinRecord & {
 *   displayLat: number,
 *   displayLng: number,
 *   stackId: string,
 *   stackSize: number,
 *   stackIndex: number,
 *   stackCenterLat: number,
 *   stackCenterLng: number,
 * }} DisplayPin */

/** Angular spread radius (~0.14° ≈ 15 km); grows slightly with stack count. */
const SPREAD_BASE_DEG = 0.14

/**
 * @param {string} city
 * @param {string} country
 */
function cityStackKey(city, country) {
  return `${String(city).trim().toLowerCase()}|${String(country).trim().toLowerCase()}`
}

/**
 * Fan pins in the same city/country into a small circle so each stays visible and pickable.
 * @param {PinRecord[]} pins
 * @returns {DisplayPin[]}
 */
export function spreadPinsForDisplay(pins) {
  /** @type {Map<string, PinRecord[]>} */
  const groups = new Map()

  for (const pin of pins) {
    const key = cityStackKey(pin.city, pin.country)
    const list = groups.get(key)
    if (list) list.push(pin)
    else groups.set(key, [pin])
  }

  /** @type {DisplayPin[]} */
  const result = []

  for (const [stackId, group] of groups) {
    const centerLat = group.reduce((s, p) => s + p.lat, 0) / group.length
    const centerLng = group.reduce((s, p) => s + p.lng, 0) / group.length
    const n = group.length
    const radius =
      n === 1 ? 0 : SPREAD_BASE_DEG * Math.min(2.2, 0.85 + n * 0.18)
    const lngScale = Math.cos((centerLat * Math.PI) / 180) || 1e-6

    group.forEach((pin, i) => {
      let displayLat = centerLat
      let displayLng = centerLng
      if (n > 1) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        displayLat = centerLat + radius * Math.cos(angle)
        displayLng = centerLng + (radius * Math.sin(angle)) / lngScale
      }
      result.push({
        ...pin,
        displayLat,
        displayLng,
        stackId,
        stackSize: n,
        stackIndex: i,
        stackCenterLat: centerLat,
        stackCenterLng: centerLng,
      })
    })
  }

  return result
}

/**
 * @param {import('three').Object3D} root
 * @returns {DisplayPin | null}
 */
export function getPinDataFromRoot(root) {
  return root?.userData?.fanmapPinData ?? null
}
