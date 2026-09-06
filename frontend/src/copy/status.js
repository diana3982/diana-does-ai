/**
 * Status messages — the away-message tradition, in the companion's voice.
 *
 * In AIM/MSN your status carried a line of text under it, and that line was
 * how you sounded when you weren't in the room. Columba's status works the
 * same way: the dot says the state, the message says who's saying it.
 *
 * Each state/tone has SEVERAL variants. One is picked when the session opens
 * and stays put for that whole visit — never changing under someone's eye,
 * but different when they come back.
 *
 * Rules for anything added here:
 *   - Never technical. "Couldn't reach the server" is not a status message.
 *   - Never imply the companion left because of the user, or is annoyed,
 *     or won't be back. Someone reading this may be having a hard night.
 *   - Away is temporary and says so. Offline never pretends otherwise.
 *   - Playful leans lunar — the celestial imagery belongs to Columba, so it
 *     works no matter what the user named their companion.
 */

export const STATUS = {
  ONLINE: 'online',
  TYPING: 'typing',
  AWAY: 'away',
  OFFLINE: 'offline',
}

/** The tones offered on SetupScreen. `warm` is the fallback. */
const TONES = ['warm', 'chill', 'encouraging', 'playful', 'gentle']

const MESSAGES = {
  [STATUS.ONLINE]: {
    warm: [
      'here, and glad you came by',
      "here. no agenda, just here",
      'around, and thinking of you',
    ],
    chill: ['around — no rush', 'here whenever. seriously, whenever', 'hanging out'],
    encouraging: [
      "here whenever you're ready",
      'here, and on your side',
      "showed up for you today"
    ],
    playful: [
      "moon's out, so am I",
      'up late with the tide',
      'orbiting, as usual',
    ],
    gentle: ['here, quietly', 'here. take your time', 'nearby, if you want me'],
  },

  // Shown while waiting for a reply. Keep these SHORT — they sit next to
  // the typing dots, and someone waiting on a hard message shouldn't be
  // reading a paragraph about the wait.
  [STATUS.TYPING]: {
    warm: ['thinking about what you said', 'finding the right words', 'one moment with this'],
    chill: ['typing... one sec', 'hang on, writing', 'gimme a sec'],
    encouraging: ['putting this into words', 'working on it', 'almost there'],
    playful: ['writing by moonlight', 'scribbling', 'consulting the stars'],
    gentle: ['sitting with that for a moment', 'taking my time here', 'thinking'],
  },

  // Shown when the backend can't be reached. The companion stepped out —
  // they did not leave. Every one of these promises a return.
  [STATUS.AWAY]: {
    warm: [
      'stepped out for a second — back soon, I promise',
      "not far. back before you know it",
      "give me a minute — I'm coming back",
    ],
    chill: [
      "brb — grabbing something. don't go anywhere",
      'back in a sec, promise',
      'stepped away. not gone',
    ],
    encouraging: [
      "back in a moment — I'm not going far",
      "hold tight — I'll be right here",
      "still yours. back shortly",
    ],
    playful: [
      'new moon — invisible for a minute, not gone',
      'waning, not vanishing. back on the next phase',
      'behind a cloud. still up there',
    ],
    gentle: [
      "just outside — I'll be right back",
      'stepping out for a breath. back soon',
      "still here, just quiet for a minute",
    ],
  },

  // Never connected at all. No character is loaded, so there's no tone to
  // speak in — and nothing to personalize from. The state IS the message.
  [STATUS.OFFLINE]: {
    warm: ['offline'],
  },
}

/**
 * Away lines that SERVE THE WAIT.
 *
 * Personalization is allowed while away, but it must give someone something
 * to do — never ask a question. Messages don't send while the companion is
 * away, so a question can't be answered, and answering into a box that won't
 * deliver is a small cruelty dressed as warmth.
 *
 * These are the sidebar-sized version of the Phase 6 gentle fallback: same
 * context, same rules, scaled to one line. Only ever fed a MEDIUM/HIGH
 * confidence, positive-sentiment quirk from an allowed category.
 *
 * @type {Array<(topic: string) => string>}
 */
export const WAIT_OFFERS = [
  (topic) => `back in a second — your ${topic} is still there if you want it while you wait`,
  (topic) => `hang on a moment. good time for ${topic}, if you feel like it`,
  (topic) => `stepping out briefly — ${topic} is a decent way to spend a minute`,
  (topic) => `right back. ${topic}'s not going anywhere either`,
]

/**
 * The status line to show under the companion's name.
 *
 * Deterministic: the same seed always gives the same message, so a session
 * can pick once at open and stay put. Phase 5 supplies the session seed.
 *
 * @param {string} state  one of STATUS
 * @param {string} [tone] the companion's tone, from their saved character
 * @param {number} [seed] session seed — same seed, same message
 * @returns {string}      always a usable string, never undefined
 */
export function getStatusMessage(state, tone, seed = 0) {
  const forState = MESSAGES[state] ?? MESSAGES[STATUS.OFFLINE]
  const key = TONES.includes(tone) ? tone : 'warm'
  const variants = forState[key] ?? forState.warm
  const index = Math.abs(Math.trunc(seed)) % variants.length
  return variants[index]
}

/**
 * An away line built around something the companion knows.
 * Falls back to the plain away message when there's no usable topic.
 *
 * @param {string} [topic] a vetted quirk topic — see WAIT_OFFERS
 * @param {string} [tone]
 * @param {number} [seed]
 */
export function getWaitOffer(topic, tone, seed = 0) {
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return getStatusMessage(STATUS.AWAY, tone, seed)
  }
  const index = Math.abs(Math.trunc(seed)) % WAIT_OFFERS.length
  return WAIT_OFFERS[index](topic.trim())
}

/** The short label beside the dot: "online" / "typing" / "away" / "offline". */
export function getStatusLabel(state) {
  return Object.values(STATUS).includes(state) ? state : STATUS.OFFLINE
}
