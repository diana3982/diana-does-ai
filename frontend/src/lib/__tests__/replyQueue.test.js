import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_PARTS,
  MAX_PAUSE_MS,
  MIN_PAUSE_MS,
  PAUSE_PER_CHAR_MS,
  TOTAL_PAUSE_CAP_MS,
  createReplyQueue,
  planPauses,
  splitReply,
} from '../replyQueue'

/**
 * The reply queue on its own: where a reply breaks, how long each break
 * lasts, and how delivery starts and stops. Timers are fake; nothing here
 * touches React or the network.
 */

/** Long enough that its pause lands between the floor and the ceiling. */
const MID = 'x'.repeat(200)

describe('splitReply', () => {
  it('leaves a reply with no blank line whole', () => {
    expect(splitReply('i hear you. that sounds exhausting.')).toEqual([
      'i hear you. that sounds exhausting.',
    ])
  })

  it('does not split on a single line break', () => {
    // One newline is formatting inside a thought, not a second message.
    expect(splitReply('line one\nline two')).toEqual(['line one\nline two'])
  })

  it('splits where the model left a blank line', () => {
    expect(splitReply('that sounds exhausting.\n\nwhat is weighing heaviest?')).toEqual([
      'that sounds exhausting.',
      'what is weighing heaviest?',
    ])
  })

  it('never splits on sentences', () => {
    // The reason this rule exists: one thought, two sentences.
    expect(splitReply("i don't think that's true. you showed up.")).toHaveLength(1)
  })

  it('treats a blank line with stray whitespace as a break', () => {
    expect(splitReply('one\n   \ntwo')).toEqual(['one', 'two'])
  })

  it('handles \\r\\n line endings', () => {
    expect(splitReply('one\r\n\r\ntwo')).toEqual(['one', 'two'])
  })

  it('drops empty parts from runs of blank lines', () => {
    expect(splitReply('one\n\n\n\n\ntwo')).toEqual(['one', 'two'])
  })

  it('trims each part', () => {
    expect(splitReply('  one  \n\n  two  ')).toEqual(['one', 'two'])
  })

  it(`caps a reply at ${MAX_PARTS} bubbles and drops nothing`, () => {
    const parts = splitReply(['a', 'b', 'c', 'd', 'e', 'f'].join('\n\n'))
    expect(parts).toHaveLength(MAX_PARTS)
    expect(parts.slice(0, MAX_PARTS - 1)).toEqual(['a', 'b', 'c'])
    // The overflow is rejoined into the last bubble, with its breaks kept.
    expect(parts[MAX_PARTS - 1]).toBe('d\n\ne\n\nf')
  })

  it('never returns an empty list, even for nothing', () => {
    expect(splitReply('')).toEqual([''])
    expect(splitReply(undefined)).toEqual([''])
  })
})

describe('planPauses', () => {
  it('never delays the first part', () => {
    expect(planPauses([MID, MID])[0]).toBe(0)
  })

  it('scales a pause with the part before it', () => {
    const [, pause] = planPauses([MID, 'next'])
    expect(pause).toBe(MID.length * PAUSE_PER_CHAR_MS)
  })

  it('holds short parts at the floor, so two bubbles never blur into one', () => {
    expect(planPauses(['hi', 'there'])[1]).toBe(MIN_PAUSE_MS)
  })

  it('holds long parts at the ceiling', () => {
    expect(planPauses(['x'.repeat(5000), 'there'])[1]).toBe(MAX_PAUSE_MS)
  })

  it('keeps a whole reply under the total cap', () => {
    const long = 'x'.repeat(5000)
    const pauses = planPauses([long, long, long, long])
    expect(pauses.reduce((sum, pause) => sum + pause, 0)).toBeLessThanOrEqual(TOTAL_PAUSE_CAP_MS)
  })

  it('lets the cap win over the floor, on purpose', () => {
    // A reply that takes too long to finish arriving is the worse failure.
    const long = 'x'.repeat(5000)
    const pauses = planPauses([long, long, long, long])
    expect(Math.min(...pauses.slice(1))).toBeLessThan(MAX_PAUSE_MS)
  })

  it('keeps the rhythm when it scales -- a longer part still earns a longer gap', () => {
    const pauses = planPauses(['x'.repeat(5000), 'x'.repeat(5000), 'x'.repeat(150), 'end'])
    expect(pauses[2]).toBeGreaterThan(pauses[3])
  })
})

describe('createReplyQueue', () => {
  let onPart
  let onDone
  let queue

  beforeEach(() => {
    vi.useFakeTimers()
    onPart = vi.fn()
    onDone = vi.fn()
    queue = createReplyQueue({ onPart, onDone })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delivers the first part synchronously', () => {
    // Someone already waited for the reply to come back.
    queue.deliver(['first', 'second'])
    expect(onPart).toHaveBeenCalledTimes(1)
    expect(onPart).toHaveBeenCalledWith('first')
  })

  it('finishes a one-part reply before deliver returns, with no timer', () => {
    // The common case must be indistinguishable from before this existed.
    queue.deliver(['only'])
    expect(onPart).toHaveBeenCalledWith('only')
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(queue.isDelivering()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('holds the next part until its pause has passed', () => {
    const parts = [MID, 'second']
    const [, pause] = planPauses(parts)
    queue.deliver(parts)

    vi.advanceTimersByTime(pause - 1)
    expect(onPart).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(onPart).toHaveBeenLastCalledWith('second')
  })

  it('delivers every part in order', () => {
    queue.deliver(['a', 'b', 'c'])
    vi.runAllTimers()
    expect(onPart.mock.calls.map(([part]) => part)).toEqual(['a', 'b', 'c'])
  })

  it('is delivering from the first part until the last', () => {
    queue.deliver(['a', 'b', 'c'])
    expect(queue.isDelivering()).toBe(true)
    vi.advanceTimersByTime(MIN_PAUSE_MS)
    expect(queue.isDelivering()).toBe(true)
    vi.runAllTimers()
    expect(queue.isDelivering()).toBe(false)
  })

  it('calls onDone once, when the last part arrives', () => {
    queue.deliver(['a', 'b', 'c'])
    expect(onDone).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('stops the remaining parts when cancelled', () => {
    queue.deliver(['a', 'b', 'c'])
    queue.cancel()
    vi.runAllTimers()
    expect(onPart).toHaveBeenCalledTimes(1)
    expect(queue.isDelivering()).toBe(false)
  })

  it('still calls onDone when a delivery is cancelled', () => {
    // Whoever tracks a delivering state is told either way. Without this,
    // clearing the chat mid-reply would leave the typing indicator up over
    // an empty window, because nothing would ever say the delivery ended.
    queue.deliver(['a', 'b', 'c'])
    queue.cancel()
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('does not call onDone for a cancel with nothing to cancel', () => {
    queue.cancel()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('does not fire onDone twice when cancelled after finishing', () => {
    queue.deliver(['a', 'b'])
    vi.runAllTimers()
    queue.cancel()
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('ends an unfinished delivery when a new one starts', () => {
    queue.deliver(['a', 'b', 'c'])
    queue.deliver(['x'])
    vi.runAllTimers()
    expect(onPart.mock.calls.map(([part]) => part)).toEqual(['a', 'x'])
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('is safe to deliver an empty list', () => {
    queue.deliver([])
    expect(onPart).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
