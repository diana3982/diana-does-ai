import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CAP_MS, IDLE_MS, SETTLE_MS, createSendQueue } from '../sendQueue'

/**
 * The queue is all timers, so these run on fake ones. Nothing here touches
 * React or the network -- this is the timing rule on its own.
 */
describe('createSendQueue', () => {
  let onFlush

  beforeEach(() => {
    vi.useFakeTimers()
    onFlush = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends a lone message after the short window', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('hey')

    vi.advanceTimersByTime(SETTLE_MS - 1)
    expect(onFlush).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onFlush).toHaveBeenCalledWith(['hey'])
  })

  it('does not make a lone message wait out the idle window', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('hey')

    // Someone who says one thing and stops typing is done. Making them
    // wait the full idle window would be the common case paying for the
    // rare one.
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledTimes(1)
  })

  it('joins fragments sent in a burst into one turn', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('hi')
    vi.advanceTimersByTime(400)
    queue.push('sorry')
    vi.advanceTimersByTime(400)
    queue.push('today was bad')

    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(onFlush).toHaveBeenCalledWith(['hi', 'sorry', 'today was bad'])
  })

  it('waits longer once typing resumes', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('hi')

    vi.advanceTimersByTime(600)
    queue.noteTyping()

    // The short window would have fired by now. Typing bought more time.
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).not.toHaveBeenCalled()

    vi.advanceTimersByTime(IDLE_MS - SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith(['hi'])
  })

  it('keeps waiting while someone is still typing', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('hi')

    // Once typing has started inside the short window, each keystroke
    // buys the full idle window again -- someone composing slowly is not
    // interrupted halfway through.
    // Kept under the ceiling on purpose -- that has its own test below.
    vi.advanceTimersByTime(SETTLE_MS - 500)
    for (let i = 0; i < 3; i += 1) {
      queue.noteTyping()
      vi.advanceTimersByTime(IDLE_MS - 500)
      expect(onFlush).not.toHaveBeenCalled()
    }
  })

  it('gives up on a fragment nobody follows', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('hi')

    // The gap ran past the short window before a key was touched. There is
    // no way to know a second thought was coming, so this one goes out and
    // anything after it becomes its own turn.
    vi.advanceTimersByTime(SETTLE_MS)
    queue.noteTyping()

    expect(onFlush).toHaveBeenCalledWith(['hi'])
  })

  it('ignores typing when nothing is waiting to go', () => {
    const queue = createSendQueue({ onFlush })
    queue.noteTyping()

    vi.advanceTimersByTime(CAP_MS)
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('sends at the ceiling however long typing goes on', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('hi')

    // Typing that never stops must not hold someone's words forever.
    for (let elapsed = 0; elapsed < CAP_MS; elapsed += 1000) {
      vi.advanceTimersByTime(1000)
      queue.noteTyping()
    }

    expect(onFlush).toHaveBeenCalledWith(['hi'])
  })

  it('waits for an in-flight turn instead of racing it', () => {
    let busy = true
    const queue = createSendQueue({ onFlush, isBusy: () => busy })
    queue.push('one more thing')

    vi.advanceTimersByTime(SETTLE_MS * 3)
    expect(onFlush).not.toHaveBeenCalled()

    busy = false
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith(['one more thing'])
  })

  it('collects anything sent while a turn is in flight', () => {
    let busy = true
    const queue = createSendQueue({ onFlush, isBusy: () => busy })
    queue.push('wait')
    vi.advanceTimersByTime(SETTLE_MS)
    queue.push('also this')

    busy = false
    vi.advanceTimersByTime(SETTLE_MS)
    expect(onFlush).toHaveBeenCalledWith(['wait', 'also this'])
  })

  it('hands back what it drops when cancelled', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('never mind')
    expect(queue.size()).toBe(1)

    expect(queue.cancel()).toEqual(['never mind'])
    expect(queue.size()).toBe(0)

    vi.advanceTimersByTime(CAP_MS)
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('starts clean after a batch goes out', () => {
    const queue = createSendQueue({ onFlush })
    queue.push('first')
    vi.advanceTimersByTime(SETTLE_MS)

    queue.push('second')
    vi.advanceTimersByTime(SETTLE_MS)

    expect(onFlush).toHaveBeenNthCalledWith(1, ['first'])
    expect(onFlush).toHaveBeenNthCalledWith(2, ['second'])
  })
})
