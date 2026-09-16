/**
 * Bolder text, for anyone who finds weight easier to read than size.
 *
 * An accessibility setting, not a style one — Windows ships the same thing
 * as "Make text bolder", and for many low-vision readers weight helps more
 * than size does. Off by default; nothing changes unless it is asked for.
 *
 * It applies to PROSE -- the companion's profile, the conversation, and the
 * message someone is still typing -- and not to chrome. Labels, buttons and
 * timestamps stay as they are: bold everywhere would flatten the difference
 * between a heading and a sentence, and the chrome is already heavier than
 * the prose.
 *
 * The composer was left out of the first version of this, on a rule that
 * sounded right and wasn't: "what you read, not what you operate". The
 * composer is both, and the half-written sentence in it is the one piece of
 * text in the app that isn't there yet -- which makes it the worst place to
 * make someone squint, not an acceptable one.
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
