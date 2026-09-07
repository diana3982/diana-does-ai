/**
 * The send queue — the thing that lets someone finish their thought.
 *
 * People in the middle of something hard don't text in paragraphs. They
 * text in pieces: "hi", "sorry", "i don't know why i'm typing this",
 * "today was bad". Answering the first piece while they're still writing
 * the third is talking over them, and it is the most machine-like thing
 * this app could do.
 *
 * So a bubble is not a turn. Fragments sent close together are held here,
 * joined, and sent as one turn. The companion answers the whole thought.
 *
 * Why this lives on the client: `/chat` is request/response, so the
 * backend has no idea anyone is typing between calls — and it doesn't need
 * to. The composer sees every keystroke. Waiting here is just not calling
 * yet; there is no request in flight to hold back.
 *
 * Two silences mean different things, which is why there are two windows:
 *
 *   - SETTLE — sent, and nothing typed since. They're done. Short, and
 *              longer when what they sent reads like an opener.
 *   - IDLE   — sent, started typing again, then stopped. They were still
 *              composing and either finished or deleted it. Longer.
 *   - CAP    — a ceiling, so no one's words are ever held indefinitely.
 */

/**
 * Sent, and the composer has stayed quiet, after something substantial
 * enough to stand on its own.
 */
export const SETTLE_MS = 2000

/**
 * The same silence after something short. "hi", "hey", "sorry", "so" --
 * an opener is rarely the whole thought, and the pause before someone
 * starts typing the rest of it runs longer than two seconds, because they
 * are working out how to say it.
 *
 * The two windows exist because the goals genuinely conflict: a lone
 * message should go quickly, and a follow-up should be caught. Only one
 * can win inside any given second, so the length of what was sent decides
 * which. The asymmetry makes that safe -- guessing "opener" wrong on a
 * short complete thought costs a few seconds of dots, while guessing
 * "complete" wrong on an opener costs an interrupted sentence.
 */
export const OPENER_SETTLE_MS = 5000

/** Below this, a fragment is treated as an opener rather than a thought. */
export const OPENER_MAX_CHARS = 30

/**
 * Not a judgement about grammar. Terminal punctuation would be the obvious
 * signal and is useless here -- almost nobody puts a full stop on a text.
 * Length is the honest one: short things tend to be run-ups.
 *
 * @param {string} text
 */
export function looksLikeAnOpener(text) {
  return text.trim().length <= OPENER_MAX_CHARS
}

/** Sent, then typing resumed and stopped again. Room to finish a sentence. */
export const IDLE_MS = 5000

/** Longest anything waits, however much typing keeps happening. */
export const CAP_MS = 20000

/**
 * @param {object}   options
 * @param {function} options.onFlush    called with the batch, oldest first
 * @param {function} options.isBusy     true while a turn is already in flight
 * @param {function} options.hasUnsent  true while words sit in the composer
 * @returns a queue with push / noteTyping / cancel / size
 */
export function createSendQueue({
  onFlush,
  isBusy = () => false,
  hasUnsent = () => false,
  settleMs = SETTLE_MS,
  openerSettleMs = OPENER_SETTLE_MS,
  idleMs = IDLE_MS,
  capMs = CAP_MS,
}) {
  let batch = []
  let timer = null
  let capTimer = null
  /**
   * The ceiling has passed and this batch goes out at the next chance it
   * gets. Kept as state rather than passed into `fire`, because the
   * ceiling can come due while a turn is in flight -- and a ceiling that
   * arrives at a busy moment has to survive it, not be dropped.
   */
  let overdue = false

  const arm = (ms) => {
    clearTimeout(timer)
    timer = setTimeout(fire, ms)
  }

  function fire() {
    // A turn is already in flight. The backend writes the user's message
    // into history before it answers, so there is nothing to cancel and
    // nothing to join it to -- wait it out and go next.
    if (isBusy()) {
      arm(settleMs)
      return
    }

    // Words sitting unsent in the composer are the rest of this thought.
    // Timing alone can't catch someone who starts typing a moment after
    // the window closes, and no window is short or long enough to fix
    // that -- but a composer with something in it is not a moment, it is
    // a state, and it says plainly that they aren't finished.
    if (!overdue && hasUnsent()) {
      arm(idleMs)
      return
    }

    const items = batch
    batch = []
    clearTimeout(timer)
    timer = null
    clearTimeout(capTimer)
    capTimer = null
    overdue = false

    if (items.length > 0) onFlush(items)
  }

  return {
    /**
     * A fragment the user has sent. Starts, or restarts, the quiet window --
     * a longer one when this fragment reads like a run-up to something.
     *
     * @param {{text: string}} item  anything with the text on it; the rest
     *        is carried through to onFlush untouched.
     */
    push(item) {
      batch.push(item)
      // The ceiling is set by the first fragment of a batch and runs until
      // the batch goes out, so a long back-and-forth can't keep pushing it.
      // Coming due forces past an unsent draft, so a composer someone
      // typed into and walked away from can't hold a message for good.
      if (capTimer === null) {
        capTimer = setTimeout(() => {
          overdue = true
          fire()
        }, capMs)
      }
      arm(looksLikeAnOpener(item.text) ? openerSettleMs : settleMs)
    },

    /**
     * A keystroke in the composer. Only means anything while something is
     * already waiting to go -- otherwise there's nothing to hold.
     */
    noteTyping() {
      if (batch.length === 0) return
      arm(idleMs)
    },

    /** Drops everything without sending, and hands back what was dropped. */
    cancel() {
      clearTimeout(timer)
      timer = null
      clearTimeout(capTimer)
      capTimer = null
      overdue = false
      const items = batch
      batch = []
      return items
    },

    size: () => batch.length,
  }
}
