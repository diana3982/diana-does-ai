/**
 * SetupScreen copy and options.
 *
 * The form's vocabulary lives here rather than in the component: the stat
 * descriptors are user-facing writing, and they belong with the rest of the
 * copy where they can be read and revised in one place.
 */

/**
 * Age ranges rather than exact ages. The range is what actually matters:
 * it tells the companion how to carry itself, how to speak, and how much
 * it has lived through — a precise number never did.
 */
export const AGES = [
  { value: '15-19', label: '15-19' },
  { value: '20-25', label: '20-25' },
  { value: '26-30', label: '26-30' },
  { value: '31-40', label: '31-40' },
  { value: '41-50', label: '41-50' },
  { value: '51+', label: '51+' },
]

/**
 * Gender options. The value goes straight into the system prompt as
 * "a {gender} companion", so each one has to read grammatically.
 *
 * "any" sends `gender-neutral` rather than picking one at random: no
 * preference is not the same as an identity, and assigning one the user
 * didn't choose would be putting words in their mouth. From there the
 * companion can pick up a preference from conversation cues over time.
 */
export const GENDERS = [
  { value: 'girl', label: 'girl' },
  { value: 'boy', label: 'boy' },
  { value: 'nonbinary', label: 'nonbinary' },
  { value: 'gender-neutral', label: "any" },
]

export const TONES = [
  { value: 'warm', label: 'warm' },
  { value: 'chill', label: 'chill' },
  { value: 'uplifting', label: 'uplifting' },
  { value: 'playful', label: 'playful' },
  { value: 'gentle', label: 'gentle' },
]

/**
 * The three personality stats, each with a descriptor per value.
 *
 * Descriptors are written to describe a *person you'd want to talk to* at
 * every setting — there is no bad end of any slider. A 1 is not "less
 * caring", it's "calm and measured". Nobody should feel they built the
 * wrong companion.
 */
export const STATS = [
  {
    key: 'compassion',
    emoji: '💛',
    label: 'compassion',
    descriptors: {
      1: 'calm and measured',
      2: 'thoughtful and steady',
      3: 'warm and caring',
      4: 'deeply empathetic',
      5: 'overflowing with heart',
    },
  },
  {
    key: 'real_talk',
    emoji: '💬',
    label: 'real talk',
    descriptors: {
      1: 'gentle and careful',
      2: 'honest but soft',
      3: 'honest and direct',
      4: 'blunt and unfiltered',
      5: 'no sugarcoating, ever',
    },
  },
  {
    key: 'humor',
    emoji: '😄',
    label: 'humor',
    descriptors: {
      1: 'serious and calm',
      2: 'lightens up occasionally',
      3: 'light when you need it',
      4: 'naturally funny and silly',
      5: 'laughter comes easy',
    },
  },
]

/**
 * What someone is asking the companion for — not who it is.
 *
 * This replaced the `creativity` slider. That slider set how often creative
 * outlets came up, and called its lowest rung "grounded and practical", so
 * someone who wanted practical help chose the rung that gave them the least
 * of everything. Making the label honest fixed the lie but not the gap:
 * there was still no way to ask for plain advice, and no way at all to ask
 * just to be heard.
 *
 * Deliberately NOT a fifth entry in STATS. A stat is a dial from 1 to 5 with
 * a descriptor per value, and `about.js` reads every stat's `descriptors`
 * map to write the profile blurb — an entry without one would break it. It
 * is also not a trait: it says what this person wants today, and it can be
 * a different answer tomorrow.
 *
 * One at a time. "just listen" and "give me advice" together would ask the
 * companion to hold back and to offer in the same breath.
 */
export const MODES = [
  { key: 'listen', emoji: '👂', label: 'just listen' },
  { key: 'unpack', emoji: '🧩', label: 'help me unpack it' },
  { key: 'advice', emoji: '💬', label: 'give me advice' },
  { key: 'suggest', emoji: '💡', label: 'give me an idea' },
]

/** Where someone lands before choosing. Matches DEFAULT_MODE in modes.py. */
export const DEFAULT_MODE = 'unpack'

/** Celestial names for "choose for me" — Columba's neighbourhood. */
export const RANDOM_NAMES = [
  'luna',
  'vega',
  'nova',
  'lyra',
  'orion',
  'astra',
  'juno',
  'sol',
  'wren',
  'echo',
  'iris',
  'atlas',
]

export const SETUP_COPY = {
  tagline: 'a steady presence for anyone navigating their own storm',
  namePlaceholder: 'give your companion a name...',
  nameLabel: 'companion name',
  ageLabel: 'how old is your companion?',
  /* No age is pre-selected — a default would quietly speak for someone. */
  agePlaceholder: 'choose an age range...',
  ageMissing: 'pick an age range for your companion 💙',
  genderLabel: 'gender',
  toneLabel: 'tone',
  statsLabel: 'personality',
  /* "right now", because it is the one choice here that is not about who
     the companion is — and the one someone can change their mind about. */
  modeLabel: 'what do you need right now?',
  randomize: '[ ✨ choose for me ]',
  /** Shown after "choose for me" fills the form — you confirm, it doesn't. */
  randomized: 'picked one for you — change anything you like 💙',
  submit: '[ meet your companion → ]',
  submitting: '[ saying hello... ]',
  /** Shown if the name is missing — a nudge, not a scolding. */
  nameMissing: 'your companion needs a name first 💙',
  /** Shown if POST /character fails. Straight from the SPEC error table. */
  saveFailed: "hmm, couldn't save that. give it another try?",
}
