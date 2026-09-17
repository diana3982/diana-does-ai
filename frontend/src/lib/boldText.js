/**
 * Bolder text, for anyone who finds weight easier to read than size.
 *
 * An accessibility setting, not a style one — Windows ships the same thing
 * as "Make text bolder", and for many low-vision readers weight helps more
 * than size does. Off by default; nothing changes unless it is asked for.
 *
 * It applies to EVERY window, from one rule on `body` in App.css.
 *
 * Two narrower versions came first and both were wrong the same way. The
 * first covered the chat and left out the composer, on a rule that sounded
 * right -- "what you read, not what you operate" -- when the composer is
 * both, and a half-written sentence is the one piece of text in the app
 * that is not there yet. The second still did nothing on the
 * create-companion screen, which is the screen someone was squinting at
 * when they asked for this.
 *
 * The lesson is in the category, not the selectors: an accessibility
 * setting does not get an opinion about which windows deserve it, and a
 * list of selectors is how it quietly acquires one.
 *
 * Hierarchy survives because everything meant to stand out already declares
 * 700 or more -- headings, primary buttons, the companion's name. Body text
 * moves 400 -> 600 underneath them, so the gap narrows and never closes.
 */
import { createPreference } from './preference'

/**
 * The weight itself lives in App.css as `--reading-weight`, not here: CSS
 * cannot import from JavaScript, so a copy in this file would be a second
 * definition of the same number waiting to disagree with the first.
 */
export const BOLD_OPTIONS = ['off', 'on']
export const DEFAULT_BOLD_TEXT = 'off'

/** Exported whole, for the same reason as `textSize`. */
export const boldText = createPreference({
  storageKey: 'columba-bold-text',
  attribute: 'boldText',
  values: BOLD_OPTIONS,
  fallback: DEFAULT_BOLD_TEXT,
})
