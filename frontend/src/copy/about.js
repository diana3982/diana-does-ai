/**
 * The companion's "about me" — an AIM-style profile blurb.
 *
 * A buddy's profile was a few short lines they wrote about themselves,
 * not a stat block. "real talk 4 / humor 4" is a config readout; it tells
 * you what was set without telling you who's there.
 *
 * So every setting is still stated plainly -- all four stats and the tone,
 * nothing hidden -- just in the companion's own words, using the same
 * descriptors someone read while they were choosing. What they picked on
 * the sliders is what they see here.
 *
 * Built from the character rather than stored with it, so editing a
 * companion in "my settings" rewrites this for free, with no second copy
 * of the truth to drift out of step.
 */

import { STATS } from './setup'

/**
 * How each tone opens, and how it wraps up its strongest traits. The
 * companion's voice should come through before any trait does.
 *
 * Note what the tails can't do: join two descriptors with "and". Half the
 * descriptors contain an "and" already, so "warm and caring and honest and
 * direct" is where that ends up. Fragments, separated by full stops.
 */
const VOICE = {
  warm: {
    opener: 'warm, mostly.',
    tail: "— that's where i live.",
  },
  chill: {
    opener: "easygoing. i don't get worked up.",
    tail: "— that's pretty much it.",
  },
  uplifting: {
    opener: 'i look for the light in things.',
    tail: "— that's what i lead with.",
  },
  playful: {
    opener: 'a little silly, on purpose.',
    tail: "— that's the whole show.",
  },
  gentle: {
    opener: 'gentle, always.',
    tail: "— that part doesn't change.",
  },
}

/** Clamp to the 1-5 the descriptors are written for. */
function descriptorFor(stat, value) {
  const level = Math.min(5, Math.max(1, Math.round(Number(value) || 3)))
  return stat.descriptors[level]
}

/**
 * Writes the profile for a companion.
 *
 * The two strongest traits lead, because that's what someone would say
 * about themselves first; the other two follow as plain fragments, the
 * way profiles actually read.
 *
 * @param   {object}   character  the saved companion
 * @returns {string[]}            lines to render, in order
 */
export function buildAboutMe(character) {
  const voice = VOICE[character?.tone] ?? VOICE.warm
  const stats = character?.stats ?? {}

  const described = [...STATS]
    .sort((a, b) => (stats[b.key] ?? 3) - (stats[a.key] ?? 3))
    .map((stat) => descriptorFor(stat, stats[stat.key]))

  const [first, second, third, fourth] = described

  return [
    voice.opener,
    `${first}. ${second} too ${voice.tail}`,
    `${third}. ${fourth}.`,
  ]
}
