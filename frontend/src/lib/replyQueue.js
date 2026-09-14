/**
 * The reply queue — the companion's half of "a bubble is not a turn".
 *
 * `sendQueue.js` lets someone send a thought in pieces and have it answered
 * whole. This is the other direction: a reply with two separate beats in it
 * arrives as two messages, a moment apart, the way a person texting sends
 * the second thought after the first.
 *
 * Where a reply breaks is never guessed. It splits only on a blank line the
 * model actually wrote. Splitting on sentences was rejected -- "i don't think
 * that's true. you showed up." is one thought, and cutting it in half would
 * be worse than leaving it whole. A reply with no blank line stays one
 * bubble, exactly as before this existed.
 *
 * One real difference from the send queue shapes every number below. There,
 * waiting was free: the reply was going to take seconds anyway. Here the
 * whole reply already exists the moment it lands, so every pause is latency
 * added on purpose. The first part is never delayed, and the total is capped.
 */

/** A blank line, allowing for stray whitespace or \r\n line endings in it. */
const BREAK = /\n\s*\n/

/**
 * Most bubbles one reply can become. Past this the rest is rejoined into the
 * last one -- a model having an off day should not produce a dozen bubbles,
 * and nothing is ever dropped.
 */
export const MAX_PARTS = 4

/**
 * The pause before a part scales with the length of the part before it:
 * roughly how long that bubble takes to take in, compressed.
 *
 * Real replies run 150-300 characters a part. At this rate those land at
 * about 0.9-1.8s, so length genuinely shapes the gap. A faster-looking rate
 * of 18ms was sketched first and would have pinned almost every real part to
 * the ceiling, quietly turning the formula into a constant.
 */
export const PAUSE_PER_CHAR_MS = 6

/** Below this, two bubbles blur into one arriving. */
export const MIN_PAUSE_MS = 600

/** Above this, a pause stops reading as typing and starts reading as gone. */
export const MAX_PAUSE_MS = 2200

/**
 * The most delay one whole reply may add. Where this and the floor disagree,
 * this wins: a reply that takes too long to finish arriving is the worse
 * failure, for someone who is already waiting on it.
 */
export const TOTAL_PAUSE_CAP_MS = 4000

/**
 * The bubbles one reply becomes.
 *
 * @param {string} text  the reply as it came back from /chat
 * @returns {string[]}   at least one part; the original text when it has no
 *                       blank line, so a plain reply is untouched
 */
export function splitReply(text) {
  const source = typeof text === 'string' ? text : ''
  const parts = source
    .split(BREAK)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length <= 1) return [source.trim()]
  if (parts.length <= MAX_PARTS) return parts

  return [...parts.slice(0, MAX_PARTS - 1), parts.slice(MAX_PARTS - 1).join('\n\n')]
}

/** How long the bubble before a pause should be given. */
function pauseAfter(part) {
  return Math.min(MAX_PAUSE_MS, Math.max(MIN_PAUSE_MS, part.length * PAUSE_PER_CHAR_MS))
}

/**
 * The delay before each part, in the order they arrive.
 *
 * @param {string[]} parts
 * @returns {number[]}  one per part; the first is always 0
 */
export function planPauses(parts) {
  const pauses = parts.map((_, index) => (index === 0 ? 0 : pauseAfter(parts[index - 1])))
  const total = pauses.reduce((sum, pause) => sum + pause, 0)
  if (total <= TOTAL_PAUSE_CAP_MS) return pauses

  // Scaled together rather than trimmed from the end, so the rhythm of the
  // reply survives -- a long part is still followed by a longer gap than a
  // short one. This can take a pause below the floor, on purpose.
  const scale = TOTAL_PAUSE_CAP_MS / total
  return pauses.map((pause) => Math.floor(pause * scale))
}

/**
 * @param {object}   options
 * @param {function} options.onPart  called with each part as it arrives
 * @param {function} options.onDone  called exactly once per deliver(), when
 *        that delivery ends -- every part arrived, or it was cancelled
 * @returns a queue with deliver / cancel / isDelivering
 */
export function createReplyQueue({ onPart, onDone = () => {} }) {
  let timers = []
  let delivering = false

  /**
   * Stops any parts still waiting to arrive, and ends the delivery.
   *
   * Calls onDone when it interrupts one in progress. That is the whole reason
   * onDone means "ended" rather than "finished": whoever tracks a delivering
   * state then gets told either way, and no caller of cancel() has to
   * remember to reset it -- forgetting would leave the typing indicator up
   * over an empty window forever.
   */
  function cancel() {
    timers.forEach(clearTimeout)
    timers = []
    if (delivering) {
      delivering = false
      onDone()
    }
  }

  return {
    /**
     * Shows a reply, one part at a time.
     *
     * The first part goes out synchronously. Someone has already waited for
     * the reply to come back, and delaying the first bubble on top of that
     * would be pure punishment. A one-part reply therefore finishes before
     * this returns: no timer, no delivering state, identical to how replies
     * rendered before this existed.
     *
     * @param {string[]} parts  from splitReply
     */
    deliver(parts) {
      cancel()
      if (parts.length === 0) {
        onDone()
        return
      }

      onPart(parts[0])
      if (parts.length === 1) {
        onDone()
        return
      }

      delivering = true
      const pauses = planPauses(parts)
      let elapsed = 0
      for (let index = 1; index < parts.length; index += 1) {
        elapsed += pauses[index]
        const isLast = index === parts.length - 1
        timers.push(
          setTimeout(() => {
            onPart(parts[index])
            if (isLast) {
              timers = []
              delivering = false
              onDone()
            }
          }, elapsed),
        )
      }
    },

    /** Stops any parts still to come. Nothing already shown moves. */
    cancel,

    /** True while at least one part of the current reply is still to come. */
    isDelivering: () => delivering,
  }
}
