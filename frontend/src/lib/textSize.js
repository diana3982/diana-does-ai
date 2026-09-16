/**
 * How big the text is, and remembering the choice.
 *
 * Added after a first-time tester in her fifties was seen squinting at the
 * setup screen. The app says it meets people "whatever age they are", and
 * 15px body text quietly doesn't.
 *
 * The control lives in the title bar rather than in settings, because the
 * person who needs it has to be able to find it on the FIRST screen. A
 * preference buried behind a screen you cannot comfortably read is no
 * preference at all.
 *
 * Kept per-device in localStorage rather than on the companion: this is
 * about the screen someone is looking at, not about who they are. A phone
 * and a laptop can want different answers, and it should apply instantly,
 * before any request could come back.
 */

/** Multipliers on every text token. `small` is what the app has always been. */
export const TEXT_SIZES = [
  { key: 'small', scale: 1 },
  { key: 'medium', scale: 1.2 },
  { key: 'large', scale: 1.4 },
]

/**
 * Medium, not small.
 *
 * 15px body was never chosen -- it is just what got built first, and the
 * first person to use this app from outside the project was squinting at it.
 * Nobody has asked for the smaller size, and it stays available for anyone
 * who prefers the density.
 */
export const DEFAULT_TEXT_SIZE = 'medium'

const STORAGE_KEY = 'columba-text-size'

/** Whether a stored or passed value is one we actually have. */
export function isTextSize(key) {
  return TEXT_SIZES.some((size) => size.key === key)
}

/**
 * The saved choice, or the default.
 *
 * Storage can throw outright in a locked-down browser, not just return
 * nothing -- and a screen that fails to render because of a font preference
 * would be a poor trade.
 */
export function readTextSize() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isTextSize(stored) ? stored : DEFAULT_TEXT_SIZE
  } catch {
    return DEFAULT_TEXT_SIZE
  }
}

/** Remembers the choice. Silent if storage is unavailable -- see above. */
export function storeTextSize(key) {
  try {
    window.localStorage.setItem(STORAGE_KEY, key)
  } catch {
    /* The size still applies for this visit; it just won't be remembered. */
  }
}

/**
 * Puts the choice on the document root, where the CSS reads it.
 *
 * On the root element rather than on a wrapper so it covers everything at
 * once, including anything rendered outside the app's own tree.
 */
export function applyTextSize(key) {
  const size = isTextSize(key) ? key : DEFAULT_TEXT_SIZE
  document.documentElement.dataset.textSize = size
  return size
}

/** Reads the saved choice and applies it. Called once, as the app starts. */
export function initTextSize() {
  return applyTextSize(readTextSize())
}
