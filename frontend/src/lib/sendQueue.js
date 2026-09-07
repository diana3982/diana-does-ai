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
 *   - SETTLE — sent, and nothing typed since. They're done. Short.
 *   - IDLE   — sent, started typing again, then stopped. They were still
 *              composing and either finished or deleted it. Longer.
 *   - CAP    — a ceiling, so no one's words are ever held indefinitely.
 */

/**
 * Sent, and the composer has stayed quiet. Long enough to cover the pause
 * between sending one fragment and starting the next -- that gap is a
 * second or two in real texting, and firing inside it is the whole failure
 * this queue exists to prevent. Costs nothing on a lone message: the reply
 * takes several seconds regardless, and the typing indicator is already up.
 */
export const SETTLE_MS = 2000

/** Sent, then typing resumed and stopped again. Room to finish a sentence. */
export const IDLE_MS = 5000

/** Longest anything waits, however much typing keeps happening. */
export const CAP_MS = 20000

/**
 * @param {object}   options
 * @param {function} options.onFlush  called with the batch, oldest first
 * @param {function} options.isBusy   true while a turn is already in flight
 * @returns a queue with push / noteTyping / cancel / size
 */
export function createSendQueue({
  onFlush,
  isBusy = () => false,
  settleMs = SETTLE_MS,
  idleMs = IDLE_MS,
  capMs = CAP_MS,
}) {
  let batch = []
  let timer = null
  let capTimer = null

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

    const items = batch
    batch = []
    clearTimeout(timer)
    timer = null
    clearTimeout(capTimer)
    capTimer = null

    if (items.length > 0) onFlush(items)
  }

  return {
    /** A fragment the user has sent. Starts, or restarts, the short window. */
    push(text) {
      batch.push(text)
      // The ceiling is set by the first fragment of a batch and runs until
      // the batch goes out, so a long back-and-forth can't keep pushing it.
      if (capTimer === null) capTimer = setTimeout(fire, capMs)
      arm(settleMs)
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
      const items = batch
      batch = []
      return items
    },

    size: () => batch.length,
  }
}
