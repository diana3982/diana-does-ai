// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatScreen from '../ChatScreen'
import { sendMessage } from '../../api/columba'
import { CAP_MS, IDLE_MS, OPENER_SETTLE_MS, SETTLE_MS } from '../../lib/sendQueue'
import { planPauses, splitReply } from '../../lib/replyQueue'

/**
 * The send queue's timing is tested on its own in `src/lib/__tests__`.
 * This is the wiring: that the screen holds fragments instead of firing
 * them, that it never locks someone out of the composer, and that a
 * failure gives back every word.
 */

vi.mock('../../api/columba', () => ({
  getCharacter: vi.fn(async () => ({ exists: true })),
  resetChat: vi.fn(async () => ({})),
  sendMessage: vi.fn(async () => ({ reply: 'i hear you', intensity: 'light' })),
}))

const CHARACTER = {
  name: 'Luna',
  age: 17,
  gender: 'nonbinary',
  tone: 'warm',
  stats: { compassion: 5, real_talk: 3, humor: 3 },
}

const composer = () => screen.getByLabelText(/message luna/i)

/** A message bubble, not the same words sitting in the composer. */
const bubble = (text) => screen.queryByText(text, { selector: '.bubble-text' })

/** The three dots, up whether the turn is held or genuinely in flight. */
const typingIndicator = () => document.querySelector('.typing')

/** Types into the box the way a person does — this is what extends the wait. */
const type = (text) => fireEvent.change(composer(), { target: { value: text } })

/** Types and presses Enter. */
const send = (text) => {
  type(text)
  fireEvent.keyDown(composer(), { key: 'Enter', shiftKey: false })
}

/** Long enough to read as a whole thought rather than a run-up. */
const THOUGHT = 'today was genuinely one of the worst days i have had'

/** Lets timers fire and any resulting promise settle. */
const tick = async (ms) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

describe('ChatScreen — holding a thought together', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // jsdom implements neither of these, and neither is what's under test.
    Element.prototype.scrollIntoView = vi.fn()
    sendMessage.mockClear()
    sendMessage.mockResolvedValue({ reply: 'i hear you', intensity: 'light' })
    render(<ChatScreen character={CHARACTER} />)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows the message and the typing indicator before anything is sent', () => {
    send('hey')

    // The bubble is up and the companion looks like it is thinking, which
    // is the point: they were heard, and they still have the floor.
    expect(bubble('hey')).toBeTruthy()
    expect(typingIndicator()).toBeTruthy()
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('sends a lone message once its quiet window passes', async () => {
    send(THOUGHT)
    await tick(SETTLE_MS)

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith(THOUGHT)
  })

  it('holds an opener long enough for the thought behind it', async () => {
    send('hey')

    // The short window comes and goes; "hey" is still waiting to be joined.
    await tick(SETTLE_MS)
    expect(sendMessage).not.toHaveBeenCalled()

    send(THOUGHT)
    await tick(SETTLE_MS)

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith(`hey\n${THOUGHT}`)
  })

  it('ignores a held enter key', async () => {
    type('hey')
    fireEvent.keyDown(composer(), { key: 'Enter' })
    fireEvent.keyDown(composer(), { key: 'Enter', repeat: true })

    await tick(OPENER_SETTLE_MS)

    // Leaning on the key must not say the same thing twice.
    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith('hey')
  })

  it('sends a burst of fragments as one turn', async () => {
    send('hi')
    send('sorry')
    send('today was bad')

    await tick(OPENER_SETTLE_MS)

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith('hi\nsorry\ntoday was bad')
  })

  it('keeps holding while the next fragment is still being typed', async () => {
    send(THOUGHT)
    type('there is more')
    await tick(SETTLE_MS + IDLE_MS)

    // The windows came and went. They are mid-sentence; it waits.
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('goes at the ceiling even with a draft left sitting there', async () => {
    send(THOUGHT)
    type('there is more')
    await tick(CAP_MS)

    // Half a sentence someone walked away from cannot hold a sent message
    // for good. It goes without the words still in the box.
    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith(THOUGHT)
    expect(composer().value).toBe('there is more')
  })

  it('waits on a half-typed reply rather than talking over it', async () => {
    send('hey')

    // Typing starts just after the window would have closed -- the exact
    // moment that used to produce a reply landing mid-sentence.
    await tick(OPENER_SETTLE_MS - 50)
    type('the thing is')
    await tick(OPENER_SETTLE_MS + IDLE_MS)

    expect(sendMessage).not.toHaveBeenCalled()

    send(`the thing is, ${THOUGHT}`)
    await tick(SETTLE_MS)

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith(`hey\nthe thing is, ${THOUGHT}`)
  })

  it('never disables the composer, in flight or held', async () => {
    send(THOUGHT)
    expect(composer().disabled).toBe(false)

    await tick(SETTLE_MS)
    // Now a real request is out. Someone mid-thought still gets to type.
    expect(composer().disabled).toBe(false)
  })

  it('puts every word back when a batch fails', async () => {
    sendMessage.mockRejectedValueOnce(Object.assign(new Error('nope'), { status: 500 }))

    send('hi')
    send('today was bad')
    await tick(OPENER_SETTLE_MS)

    // The bubbles come back out and the words return to the box, joined
    // the same way they were sent, so "try again" is just another send.
    expect(bubble('hi')).toBeNull()
    expect(bubble('today was bad')).toBeNull()
    expect(composer().value).toBe('hi\ntoday was bad')
  })

  it('does not lose a message sent while a failing batch was in flight', async () => {
    let reject
    sendMessage.mockImplementationOnce(() => new Promise((_, r) => { reject = r }))

    send('first')
    await tick(OPENER_SETTLE_MS)

    // Sent while the first turn is in the air — it gets its own bubble and
    // waits its turn rather than being refused.
    send('second')

    await act(async () => {
      reject(Object.assign(new Error('nope'), { status: 500 }))
    })

    // The failure belongs to 'first' alone. Removing by position would have
    // taken 'second' out instead, because it is the one sitting at the end.
    expect(bubble('first')).toBeNull()
    expect(bubble('second')).toBeTruthy()
    expect(composer().value).toBe('first')
  })
})

describe('ChatScreen — a reply arriving in parts', () => {
  /** The companion's name header above a bubble. */
  const senders = () => document.querySelectorAll('.bubble-sender')

  /** Timestamps under bubbles. */
  const timestamps = () => document.querySelectorAll('.bubble-time')

  /** Every rendered bubble's text, in order. */
  const bubbleTexts = () =>
    [...document.querySelectorAll('.bubble-text')].map((node) => node.textContent)

  /** A reply the model wrote with a blank line between two beats. */
  const TWO_BEATS = { reply: 'that sounds exhausting.\n\nwhat is weighing heaviest?', intensity: 'light' }
  const [, PAUSE] = planPauses(splitReply(TWO_BEATS.reply))

  /**
   * The same shape with a long first part, so the gap before part two
   * outlasts the send queue's settle window.
   *
   * This matters more than it looks. With a short first part the pause sits
   * at the floor, part two lands before anything new could be sent, and a
   * test about sending mid-reply passes whether or not delivering counts as
   * busy -- it cannot fail, so it proves nothing.
   */
  const LONG_FIRST = 'x'.repeat(400)
  const LONG_REPLY = { reply: `${LONG_FIRST}\n\nthe rest of it`, intensity: 'light' }
  const [, LONG_PAUSE] = planPauses(splitReply(LONG_REPLY.reply))

  /** Sends a thought and lets its reply come back. */
  const sendAndReceive = async () => {
    send(THOUGHT)
    await tick(SETTLE_MS)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    Element.prototype.scrollIntoView = vi.fn()
    sendMessage.mockClear()
    sendMessage.mockResolvedValue(TWO_BEATS)
    render(<ChatScreen character={CHARACTER} />)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows the first part at once and the second only after its pause', async () => {
    await sendAndReceive()

    // No delay on top of the wait for the reply itself.
    expect(bubble('that sounds exhausting.')).toBeTruthy()
    expect(bubble('what is weighing heaviest?')).toBeNull()

    await tick(PAUSE)
    expect(bubble('what is weighing heaviest?')).toBeTruthy()
  })

  it('reads as one utterance: the name once, the time once', async () => {
    await sendAndReceive()
    await tick(PAUSE)

    // The user's own bubble carries a timestamp too, so two in total --
    // one for them, one for the whole reply rather than one per part.
    expect(senders()).toHaveLength(1)
    expect(timestamps()).toHaveLength(2)
  })

  it('keeps the typing indicator up between parts and takes it down after', async () => {
    await sendAndReceive()
    // The rest of the thought is still coming, the way it would be if
    // someone were texting it.
    expect(typingIndicator()).toBeTruthy()

    await tick(PAUSE)
    expect(typingIndicator()).toBeNull()
  })

  it('the long reply really does outlast the settle window', () => {
    // Guards the two tests below. If the pacing constants change and this
    // fails, those tests have silently stopped testing anything.
    expect(LONG_PAUSE).toBeGreaterThan(SETTLE_MS)
  })

  it('holds a message sent mid-reply until the reply has finished arriving', async () => {
    sendMessage.mockResolvedValue(LONG_REPLY)
    await sendAndReceive()
    expect(sendMessage).toHaveBeenCalledTimes(1)

    // Part two is still on its way. Without delivering counting as busy,
    // this would go out as soon as its window closed and a second reply
    // could thread itself between the two halves of the first.
    send(THOUGHT)
    await tick(SETTLE_MS)
    expect(bubble('the rest of it')).toBeNull()
    expect(sendMessage).toHaveBeenCalledTimes(1)

    await tick(LONG_PAUSE + SETTLE_MS)
    expect(sendMessage).toHaveBeenCalledTimes(2)
  })

  it('never lets a second reply interleave with the first', async () => {
    sendMessage
      .mockResolvedValueOnce(LONG_REPLY)
      .mockResolvedValueOnce({ reply: 'second reply', intensity: 'light' })

    await sendAndReceive()
    send(THOUGHT)

    // Stepped, not advanced in one jump. A single large advance fires every
    // due timer before any pending promise can settle -- so part two would
    // land first and the second reply's await would resume after it, putting
    // the bubbles in the right order by accident and letting this pass with
    // the fix removed. Stepping lets the send resolve where it really would.
    await tick(SETTLE_MS)
    await tick(LONG_PAUSE)
    await tick(SETTLE_MS * 2)

    const texts = bubbleTexts()
    const firstEnd = texts.indexOf('the rest of it')
    const secondReply = texts.indexOf('second reply')
    expect(firstEnd).toBeGreaterThan(-1)
    expect(secondReply).toBeGreaterThan(firstEnd)
  })

  it('clears cleanly mid-reply, with nothing arriving afterwards', async () => {
    await sendAndReceive()
    expect(bubble('that sounds exhausting.')).toBeTruthy()

    fireEvent.click(screen.getByText('[ clear this chat ]'))
    await act(async () => {
      fireEvent.click(screen.getByText('[ yes, clear it ]'))
    })

    await tick(PAUSE * 2)
    // The window stays empty: no late part, and no indicator hanging over it.
    expect(bubble('what is weighing heaviest?')).toBeNull()
    expect(typingIndicator()).toBeNull()
  })

  it('leaves a reply with no blank line exactly as it was', async () => {
    sendMessage.mockResolvedValue({ reply: 'i hear you. that sounds hard.', intensity: 'light' })
    await sendAndReceive()

    expect(bubble('i hear you. that sounds hard.')).toBeTruthy()
    expect(senders()).toHaveLength(1)
    // Nothing more coming, so no indicator lingering after it.
    expect(typingIndicator()).toBeNull()
  })
})
