/**
 * Bolder text, for anyone who finds weight easier to read than size.
 *
 * An accessibility setting, not a style one — Windows ships the same thing
 * as "Make text bolder", and for many low-vision readers weight helps more
 * than size does. Off by default; nothing changes unless it is asked for.
 *
 * It applies to what you READ -- the companion's profile and the
 * conversation -- and not to what you OPERATE. Labels, buttons and
 * timestamps stay as they are: bold everywhere would flatten the difference
 * between a heading and a sentence, and the chrome is already heavier than
 * the prose.
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
