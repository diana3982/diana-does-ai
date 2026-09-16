/**
 * How big the text is.
 *
 * Added after UAT 1, the first session with someone outside the project,
 * where UAT user 1 could not comfortably read the setup screen. Age range
 * fifties is recorded here because it is the cause: age-related vision
 * change is why 15px body text failed, and why the fix is size rather than
 * contrast. The app says it meets people "whatever age they are", and
 * 15px body text quietly didn't.
 *
 * The control lives in the title bar rather than in settings, because the
 * person who needs it has to be able to find it on the FIRST screen. A
 * preference buried behind a screen you cannot comfortably read is no
 * preference at all.
 */
import { createPreference } from './preference'

/** Multipliers on every text token. `small` is what the app used to be. */
export const TEXT_SIZES = [
  { key: 'small', scale: 1 },
  { key: 'medium', scale: 1.2 },
  { key: 'large', scale: 1.4 },
]

/**
 * Medium, not small.
 *
 * 15px body was never chosen -- it is just what got built first, and the
 * first session with someone outside the project found it hard to read.
 * Nobody has asked for the smaller size, and it stays available for anyone
 * who prefers the density.
 */
export const DEFAULT_TEXT_SIZE = 'medium'

/**
 * Exported whole rather than as loose functions: the settings menu treats
 * every preference identically, so handing it one object means adding a
 * setting there is a list entry and not a branch.
 */
export const textSize = createPreference({
  storageKey: 'columba-text-size',
  attribute: 'textSize',
  values: TEXT_SIZES.map((size) => size.key),
  fallback: DEFAULT_TEXT_SIZE,
})
