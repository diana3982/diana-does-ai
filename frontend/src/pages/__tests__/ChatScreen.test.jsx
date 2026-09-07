// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatScreen from '../ChatScreen'
import { sendMessage } from '../../api/columba'
import { IDLE_MS, SETTLE_MS } from '../../lib/sendQueue'

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
  stats: { compassion: 5, real_talk: 3, creativity: 4, humor: 3 },
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

  it('sends a lone message once the short window passes', async () => {
    send('hey')
    await tick(SETTLE_MS)

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith('hey')
  })

  it('sends a burst of fragments as one turn', async () => {
    send('hi')
    send('sorry')
    send('today was bad')

    await tick(SETTLE_MS)

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage).toHaveBeenCalledWith('hi\nsorry\ntoday was bad')
  })

  it('keeps holding while the next fragment is still being typed', async () => {
    send('hi')
    type('there is more')
    await tick(SETTLE_MS)

    // The short window came and went. They are mid-sentence; it waits.
    expect(sendMessage).not.toHaveBeenCalled()

    await tick(IDLE_MS)
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })

  it('never disables the composer, in flight or held', async () => {
    send('hey')
    expect(composer().disabled).toBe(false)

    await tick(SETTLE_MS)
    // Now a real request is out. Someone mid-thought still gets to type.
    expect(composer().disabled).toBe(false)
  })

  it('puts every word back when a batch fails', async () => {
    sendMessage.mockRejectedValueOnce(Object.assign(new Error('nope'), { status: 500 }))

    send('hi')
    send('today was bad')
    await tick(SETTLE_MS)

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
    await tick(SETTLE_MS)

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
