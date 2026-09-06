/**
 * Status messages — the away-message tradition, in the companion's voice.
 *
 * In AIM/MSN your status carried a line of text under it, and that line was
 * how you sounded when you weren't in the room. Columba's status works the
 * same way: the dot says the state, the message says who's saying it.
 *
 * Each state/tone has several variants. One is picked when the session opens
 * and stays put for that whole visit — never changing under someone's eye,
 * but different when they come back.
 *
 * ── Why every variant is filed under `always` or `light` ──────────────
 *
 * The typing status appears the instant someone hits send, whatever they
 * just said. A companion answering "oooo let me cook" to someone describing
 * the worst night of their life is the failure this structure prevents.
 *
 *   always — safe in any conversation, including the hardest ones
 *   light  — funny, casual, or breezy. Only when nothing heavy is happening
 *
 * The backend tags conversation intensity as light / medium / heavy — the
 * same tag that drives the gentle fallback, so one signal serves both:
 *
 *   light  → the funny lines unlock, and a personalized wait offer is fine
 *   medium → warm and steady, no jokes, but a wait offer still fits
 *   heavy  → `always` lines only. Nothing clever, nothing suggested
 *
 * **Unknown intensity behaves exactly like heavy** — if we don't know what
 * someone is going through, the companion doesn't joke.
 *
 * Rules for anything added here:
 *   - Never technical. "Couldn't reach the server" is not a status message.
 *   - Never imply the companion left because of the user, or is annoyed,
 *     or won't be back. Someone reading this may be having a hard night.
 *   - Away is temporary and says so. Offline never pretends otherwise.
 *   - Playful leans lunar — the celestial imagery belongs to Columba, so it
 *     works no matter what the user named their companion.
 *   - All lowercase. It's a chat window, not a form letter.
 *   - When in doubt, file it under `light`.
 */

export const STATUS = {
  ONLINE: 'online',
  TYPING: 'typing',
  AWAY: 'away',
  OFFLINE: 'offline',
}

/**
 * How heavy the conversation is right now, per the backend's tag.
 * The same three tiers the gentle fallback uses, so one tag drives both.
 */
export const INTENSITY = {
  LIGHT: 'light',   // ordinary conversation — the funny lines are fine
  MEDIUM: 'medium', // something real, not a crisis — warm, but no jokes
  HEAVY: 'heavy',   // something hard is being said — `always` only
}

/** Tiers where a personalized wait offer is welcome rather than intrusive. */
const OFFER_OK = [INTENSITY.LIGHT, INTENSITY.MEDIUM]

/** The tones offered on SetupScreen. `warm` is the fallback. */
const TONES = ['warm', 'chill', 'encouraging', 'playful', 'gentle']

const MESSAGES = {
  [STATUS.ONLINE]: {
    warm: {
      always: [
        'here, and glad you came by',
        'here. no agenda, just here',
        'around, and thinking of you',
        'here and ready to chat',
        'arms open',
        'holding space for you',
        'come as you are',
        'no judgment here',
        'soft landing',
      ],
      light: [],
    },
    chill: {
      always: [
        "around — let's chat",
        'here whenever. seriously, whenever',
        'hanging out',
        'no rush',
        'take your time',
      ],
      light: ['just vibing', 'breathing easy', 'all good'],
    },
    encouraging: {
      always: [
        "here whenever you're ready",
        'here, and on your side',
        'showed up for you today',
        'on your side',
        'i got your back',
        'rooting for you',
      ],
      light: [],
    },
    playful: {
      always: [
        "moon's out, so am i",
        'shining thru',
        'in orbit',
        'illuminated',
        'present in the dark',
      ],
      light: [],
    },
    gentle: {
      always: [
        'here, quietly',
        'here. take your time',
        'nearby, if you want me',
        'in your corner',
        'present',
        'close by',
      ],
      light: [],
    },
  },

  // Shown while waiting for a reply. Keep these SHORT — they sit next to
  // the typing dots, and someone waiting on a hard message shouldn't be
  // reading a paragraph about the wait.
  //
  // This is the state where the always/light split matters most: it fires
  // in direct response to whatever was just sent.
  [STATUS.TYPING]: {
    warm: {
      always: [
        'thinking about what you said',
        'finding the right words',
        'feeling that with you',
        'holding that thought',
        'taking that in',
      ],
      light: [],
    },
    chill: {
      always: ['typing... one sec', 'hang on, writing', 'mulling it over', 'no rush, just thinking'],
      light: ['gimme a sec'],
    },
    encouraging: {
      always: [
        'putting this into words',
        'working on it',
        'thinking this through for you',
        'i got you',
      ],
      light: ['almost there', 'working on something good'],
    },
    playful: {
      always: ['writing by moonlight', 'scribbling'],
      light: [
        'thinking thinking thinking',
        'cooking something up',
        'one sec one sec',
        'oooo let me cook',
      ],
    },
    gentle: {
      always: [
        'sitting with that for a moment',
        'taking my time here',
        'choosing words carefully',
        'thinking of you',
        'here with you',
      ],
      light: [],
    },
  },

  // Shown when the backend can't be reached. The companion stepped out —
  // they did not leave. Every one of these promises a return.
  [STATUS.AWAY]: {
    warm: {
      always: [
        'stepped out for a second — back soon, i promise',
        'not far. back before you know it',
        "give me a minute — i'm coming back",
        'stepped out, not away',
        'just out of reach for a second. still yours',
        'never far. be back soon',
      ],
      light: [],
    },
    chill: {
      always: [
        "brb — grabbing something. don't go anywhere",
        'back in a sec, promise',
        'stepped away. not gone',
        'around, just quiet',
        'stepped out for a sec',
      ],
      light: ['brb, all good'],
    },
    encouraging: {
      always: [
        "back in a moment — i'm not going far",
        "hold tight — i'll be right here",
        'still yours. back shortly',
        'still rooting for you. one moment',
        "haven't forgotten you. back soon",
      ],
      light: [],
    },
    playful: {
      always: [
        'new moon — invisible for a minute, not gone',
        'waning, not vanishing. back on the next phase',
        'behind a cloud. still up there',
      ],
      light: [
        'stepped out to touch grass. almost back',
        'brb, consulting the stars',
        'out on a cosmic errand',
      ],
    },
    gentle: {
      always: [
        "just outside — i'll be right back",
        'stepping out for a breath. back soon',
        'still here, just quiet for a minute',
        'still with you, just quiet right now',
        'away, but not gone',
        'holding your place. back soon',
      ],
      light: [],
    },
  },

  // Never connected at all. No character is loaded, so there's no tone to
  // speak in — and nothing to personalize from. The state IS the message.
  [STATUS.OFFLINE]: {
    warm: { always: ['offline'], light: [] },
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
 * These are the sidebar-sized version of the gentle fallback: same context,
 * same rules, scaled to one line. Only ever fed a MEDIUM/HIGH confidence,
 * positive-sentiment quirk from an allowed category — and only at light or
 * medium intensity. Never during a heavy conversation.
 *
 * @type {Array<(topic: string) => string>}
 */
export const WAIT_OFFERS = [
  (topic) => `back in a second — your ${topic} is still there if you want it while you wait`,
  (topic) => `hang on a moment. good time for ${topic}, if you feel like it`,
  (topic) => `stepping out briefly — ${topic} is a decent way to spend a minute`,
  (topic) => `right back. ${topic}'s not going anywhere either`,
]

/** The variants allowed right now. `light` only unlocks on a light tag. */
function poolFor(state, tone, intensity) {
  const forState = MESSAGES[state] ?? MESSAGES[STATUS.OFFLINE]
  const key = TONES.includes(tone) ? tone : 'warm'
  const buckets = forState[key] ?? forState.warm
  return intensity === INTENSITY.LIGHT
    ? [...buckets.always, ...buckets.light]
    : buckets.always
}

/**
 * The status line to show under the companion's name.
 *
 * Deterministic: the same seed always gives the same message, so a session
 * can pick once at open and stay put. Phase 5 supplies the session seed.
 *
 * @param {string} state       one of STATUS
 * @param {string} [tone]      the companion's tone, from their character
 * @param {number} [seed]      session seed — same seed, same message
 * @param {string} [intensity] one of INTENSITY. Anything else, including
 *                             undefined, is treated as heavy.
 *                             Only `light` unlocks the `light` bucket.
 * @returns {string}           always a usable string, never undefined
 */
export function getStatusMessage(state, tone, seed = 0, intensity) {
  const variants = poolFor(state, tone, intensity)
  const index = Math.abs(Math.trunc(seed)) % variants.length
  return variants[index]
}

/**
 * An away line built around something the companion knows.
 *
 * Falls back to a plain away message with no topic, or during a heavy
 * conversation — someone having a hard night doesn't need a suggestion,
 * they need to know their companion is coming back.
 *
 * @param {string} [topic]     a vetted quirk topic — see WAIT_OFFERS
 * @param {string} [tone]
 * @param {number} [seed]
 * @param {string} [intensity] one of INTENSITY
 */
export function getWaitOffer(topic, tone, seed = 0, intensity) {
  const usable = typeof topic === 'string' && topic.trim()
  if (!usable || !OFFER_OK.includes(intensity)) {
    return getStatusMessage(STATUS.AWAY, tone, seed, intensity)
  }
  const index = Math.abs(Math.trunc(seed)) % WAIT_OFFERS.length
  return WAIT_OFFERS[index](topic.trim())
}

/** The short label beside the dot: "online" / "typing" / "away" / "offline". */
export function getStatusLabel(state) {
  return Object.values(STATUS).includes(state) ? state : STATUS.OFFLINE
}
