import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAP_MS,
  IDLE_MS,
  OPENER_MAX_CHARS,
  OPENER_SETTLE_MS,
  SETTLE_MS,
  createSendQueue,
  looksLikeAnOpener,
} from '../sendQueue'

/**
 * The queue is all timers, so these run on fake ones. Nothing here touches
 * React or the network -- this is the timing rule on its own.
 */

/** Short enough to read as a run-up to something. */
const OPENER = { text: 'hi' }

/** Long enough to stand on its own, so it gets the short window. */
const THOUGHT = { text: 'today was genuinely one of the worst days i have had' }

describe('looksLikeAnOpener', () => {
  it('reads short fragments as run-ups', () => {
    expect(looksLikeAnOpener('hi')).toBe(true)
    expect(looksLikeAnOpener('sorry')).toBe(true)
    expect(looksLikeAnOpener('  so  ')).toBe(true)
  })

  it('reads anything substantial as a thought', () => {
    expect(looksLikeAnOpener(THOUGHT.text)).toBe(false)
    expect(looksLikeAnOpener('x'.repeat(OPENER_MAX_CHARS + 1))).toBe(false)
  })

  it('treats the boundary itself as an opener', () => {
    expect(looksLikeAnOpener('x'.repeat(OPENER_MAX_CHARS))).toBe(true)
  })
})

describe('createSendQueue', () => {
  let onFlush

  beforeEach(() => {
    vi.useFakeTimers()
    onFlush = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends a substantial message after the short window', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(THOUGHT)

    vi.advanceTimersByTime(SETTLE_MS - 1)
    expect(onFlush).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onFlush).toHaveBeenCalledWith([THOUGHT])
  })

  it('gives an opener longer to be followed', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(OPENER)

    // "hi" on its own is rarely the whole thought. The pause before someone
    // starts typing the rest of it runs past the short window.
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).not.toHaveBeenCalled()

    vi.advanceTimersByTime(OPENER_SETTLE_MS - SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith([OPENER])
  })

  it('catches a follow-up that arrives after a real pause', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(OPENER)

    // Long enough that the old single window would already have fired and
    // split this into two turns.
    vi.advanceTimersByTime(SETTLE_MS + 1500)
    queue.push(THOUGHT)

    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(onFlush).toHaveBeenCalledWith([OPENER, THOUGHT])
  })

  it('does not make a lone message wait out the idle window', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(THOUGHT)

    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledTimes(1)
  })

  it('joins fragments sent in a burst into one turn', () => {
    const queue = createSendQueue({ onFlush })
    const fragments = [{ text: 'hi' }, { text: 'sorry' }, { text: 'today was bad' }]
    fragments.forEach((fragment) => {
      queue.push(fragment)
      vi.advanceTimersByTime(400)
    })

    vi.advanceTimersByTime(OPENER_SETTLE_MS)
    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(onFlush).toHaveBeenCalledWith(fragments)
  })

  it('waits longer once typing resumes', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(THOUGHT)

    vi.advanceTimersByTime(600)
    queue.noteTyping()

    // The short window would have fired by now. Typing bought more time.
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).not.toHaveBeenCalled()

    vi.advanceTimersByTime(IDLE_MS - SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith([THOUGHT])
  })

  it('keeps waiting while someone is still typing', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(THOUGHT)

    // Once typing has started inside the quiet window, each keystroke buys
    // the full idle window again -- someone composing slowly is not
    // interrupted halfway through. Kept under the ceiling on purpose;
    // that has its own test below.
    vi.advanceTimersByTime(SETTLE_MS - 500)
    for (let i = 0; i < 3; i += 1) {
      queue.noteTyping()
      vi.advanceTimersByTime(IDLE_MS - 500)
      expect(onFlush).not.toHaveBeenCalled()
    }
  })

  it('gives up on a fragment nobody follows', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(OPENER)

    // Even the longer window runs out eventually. There is no way to know a
    // second thought was coming, so this goes out and anything after it
    // becomes its own turn.
    vi.advanceTimersByTime(OPENER_SETTLE_MS)
    queue.noteTyping()

    expect(onFlush).toHaveBeenCalledWith([OPENER])
  })

  it('does not chime in while words sit unsent in the composer', () => {
    let unsent = true
    const queue = createSendQueue({ onFlush, hasUnsent: () => unsent })
    queue.push(OPENER)

    // The window closed a moment after they started typing. Timing alone
    // would have sent this and talked over the rest of the sentence.
    vi.advanceTimersByTime(OPENER_SETTLE_MS + IDLE_MS)
    expect(onFlush).not.toHaveBeenCalled()

    // They sent it, so the composer is empty again.
    unsent = false
    queue.push(THOUGHT)
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith([OPENER, THOUGHT])
  })

  it('forces past an unsent draft at the ceiling', () => {
    const queue = createSendQueue({ onFlush, hasUnsent: () => true })
    queue.push(OPENER)

    // Someone typed half a sentence and walked away. Their sent message
    // still has to go; the draft cannot hold it for good.
    vi.advanceTimersByTime(CAP_MS)
    expect(onFlush).toHaveBeenCalledWith([OPENER])
  })

  it('does not lose the ceiling when it comes due mid-request', () => {
    let busy = true
    const queue = createSendQueue({
      onFlush,
      isBusy: () => busy,
      hasUnsent: () => true,
    })
    queue.push(OPENER)

    // The ceiling passes while a turn is in flight, so it cannot act on it
    // then. Once the turn lands, the draft still sitting in the composer
    // must not quietly hold this batch for good.
    vi.advanceTimersByTime(CAP_MS)
    expect(onFlush).not.toHaveBeenCalled()

    busy = false
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith([OPENER])
  })

  it('still waits for an in-flight turn at the ceiling', () => {
    const queue = createSendQueue({ onFlush, isBusy: () => true })
    queue.push(OPENER)

    // The ceiling overrides a draft, never a live request -- the backend
    // has already written that turn and cannot take it back.
    vi.advanceTimersByTime(CAP_MS * 2)
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('ignores typing when nothing is waiting to go', () => {
    const queue = createSendQueue({ onFlush })
    queue.noteTyping()

    vi.advanceTimersByTime(CAP_MS)
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('sends at the ceiling however long typing goes on', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(THOUGHT)

    // Typing that never stops must not hold someone's words forever.
    for (let elapsed = 0; elapsed < CAP_MS; elapsed += 1000) {
      vi.advanceTimersByTime(1000)
      queue.noteTyping()
    }

    expect(onFlush).toHaveBeenCalledWith([THOUGHT])
  })

  it('waits for an in-flight turn instead of racing it', () => {
    let busy = true
    const queue = createSendQueue({ onFlush, isBusy: () => busy })
    queue.push(THOUGHT)

    vi.advanceTimersByTime(SETTLE_MS * 3)
    expect(onFlush).not.toHaveBeenCalled()

    busy = false
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith([THOUGHT])
  })

  it('collects anything sent while a turn is in flight', () => {
    let busy = true
    const queue = createSendQueue({ onFlush, isBusy: () => busy })
    queue.push(OPENER)
    vi.advanceTimersByTime(OPENER_SETTLE_MS)
    queue.push(THOUGHT)

    busy = false
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith([OPENER, THOUGHT])
  })

  it('hands back what it drops when cancelled', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(OPENER)
    expect(queue.size()).toBe(1)

    expect(queue.cancel()).toEqual([OPENER])
    expect(queue.size()).toBe(0)

    vi.advanceTimersByTime(CAP_MS)
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('starts clean after a batch goes out', () => {
    const queue = createSendQueue({ onFlush })
    queue.push(THOUGHT)
    vi.advanceTimersByTime(SETTLE_MS)

    queue.push(THOUGHT)
    vi.advanceTimersByTime(SETTLE_MS)

    expect(onFlush).toHaveBeenNthCalledWith(1, [THOUGHT])
    expect(onFlush).toHaveBeenNthCalledWith(2, [THOUGHT])
  })
})
