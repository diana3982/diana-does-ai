/**
 * A display preference: remembered per device, applied to the page.
 *
 * Every setting in the title bar menu works the same way — read a saved
 * choice, fall back if it is missing or unrecognised, and put it on the
 * document root for the CSS to read. This holds that shape once so each
 * setting only has to say what it *is*: its key, its values, and its
 * default. Adding another touches nothing that already exists.
 *
 * Kept per device rather than on the companion: these are about the screen
 * someone is looking at, not about who they are. A phone and a laptop can
 * want different answers, and a preference should apply instantly rather
 * than after a request comes back.
 *
 * @param {object}   options
 * @param {string}   options.storageKey  localStorage key
 * @param {string}   options.attribute   camelCase dataset key on <html>;
 *                   `textSize` becomes `[data-text-size]` in CSS
 * @param {string[]} options.values      every value this setting accepts
 * @param {string}   options.fallback    used when nothing valid is stored
 */
export function createPreference({ storageKey, attribute, values, fallback }) {
  const isValid = (value) => values.includes(value)

  /**
   * The saved choice, or the fallback.
   *
   * Storage can throw outright in a locked-down browser, not just return
   * nothing — and a screen that fails to render because of a display
   * preference would be a poor trade, most of all for whoever needed it.
   */
  const read = () => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return isValid(stored) ? stored : fallback
    } catch {
      return fallback
    }
  }

  /** Remembers a choice. Silent if storage is unavailable — see above. */
  const store = (value) => {
    try {
      window.localStorage.setItem(storageKey, value)
    } catch {
      /* It still applies for this visit; it just won't be remembered. */
    }
  }

  /**
   * Puts the choice on the document root, where the CSS reads it.
   *
   * On the root rather than a wrapper so it covers everything at once,
   * including anything rendered outside the app's own tree.
   */
  const apply = (value) => {
    const chosen = isValid(value) ? value : fallback
    document.documentElement.dataset[attribute] = chosen
    return chosen
  }

  /** Reads the saved choice and applies it. Called once, as the app starts. */
  const init = () => apply(read())

  return { isValid, read, store, apply, init }
}
