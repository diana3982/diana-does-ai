/**
 * The API layer.
 *
 * What matters here is the error envelope. The backend sends
 * { error: <warm message>, detail: <technical> }; the user must only ever
 * see the first, and a request that never left the machine has to be
 * distinguishable from one the server rejected -- that difference is what
 * decides between "away" and "that didn't send".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  clearQuirks,
  deleteCharacter,
  deleteQuirk,
  getCharacter,
  getQuirks,
  resetChat,
  saveCharacter,
  sendMessage,
} from '../columba'

const json = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('happy paths', () => {
  it('reads a character', async () => {
    fetch.mockResolvedValue(json({ exists: true, character: { name: 'juno' } }))
    await expect(getCharacter()).resolves.toEqual({
      exists: true,
      character: { name: 'juno' },
    })
  })

  it('sends a message and returns the reply', async () => {
    fetch.mockResolvedValue(json({ reply: 'hey', history_length: 2 }))
    await expect(sendMessage('hi')).resolves.toEqual({ reply: 'hey', history_length: 2 })

    const [, options] = fetch.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ message: 'hi' })
  })

  it('saves a character as JSON', async () => {
    fetch.mockResolvedValue(json({ success: true }, 201))
    const character = { name: 'juno', stats: { humor: 3 } }
    await saveCharacter(character)

    const [, options] = fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual(character)
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it.each([
    ['resetChat', () => resetChat(), '/chat/reset'],
    ['getQuirks', () => getQuirks(), '/quirks'],
    ['clearQuirks', () => clearQuirks(), '/quirks'],
  ])('%s hits %s', async (_name, call, path) => {
    fetch.mockResolvedValue(json({}))
    await call()
    expect(fetch.mock.calls[0][0]).toContain(path)
  })

  it('encodes a quirk topic with a space in it', async () => {
    fetch.mockResolvedValue(json({ success: true }))
    await deleteQuirk('french toast')
    expect(fetch.mock.calls[0][0]).toContain('french%20toast')
  })

  it('asks to clear quirks only when told to', async () => {
    fetch.mockResolvedValue(json({ success: true }))

    await deleteCharacter()
    expect(fetch.mock.calls[0][0]).not.toContain('clear_quirks')

    await deleteCharacter({ clearQuirks: true })
    expect(fetch.mock.calls[1][0]).toContain('clear_quirks=true')
  })
})

describe('errors', () => {
  it("prefers the backend's warm message", async () => {
    fetch.mockResolvedValue(
      json({ error: 'Type something first 💙', detail: 'Message cannot be empty' }, 400),
    )
    await expect(sendMessage('')).rejects.toMatchObject({
      message: 'Type something first 💙',
      status: 400,
      detail: 'Message cannot be empty',
    })
  })

  it('is an ApiError, so callers can branch on it', async () => {
    fetch.mockResolvedValue(json({ error: 'nope' }, 500))
    await expect(getQuirks()).rejects.toBeInstanceOf(ApiError)
  })

  it('marks a request that never left with status 0', async () => {
    // This is the difference between "the companion is away" and "that
    // message didn't send" -- the chat window branches on exactly this.
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(sendMessage('hi')).rejects.toMatchObject({ status: 0 })
  })

  it('still fails usefully when the body is not JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    })
    const error = await sendMessage('hi').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(502)
    expect(error.message).toBeTruthy()
  })

  it('never leaks a raw status code into the message shown to someone', async () => {
    fetch.mockResolvedValue(json({ error: 'Something went wrong 💙', detail: 'KeyError: stats' }, 500))
    const error = await getCharacter().catch((e) => e)
    expect(error.message).not.toContain('KeyError')
    expect(error.detail).toContain('KeyError')
  })
})
