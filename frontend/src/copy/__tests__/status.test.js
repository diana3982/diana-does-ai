/**
 * Status message selection.
 *
 * The rules being protected here are safety rules, not style ones: the
 * lighter lines must never appear over a heavy conversation, an unknown
 * intensity must behave like the worst case, and an away message must
 * always promise a return.
 */
import { describe, expect, it } from 'vitest'
import {
  INTENSITY,
  STATUS,
  TONES,
  getStatusMessage,
  getWaitOffer,
} from '../status'
import { TONES as SELECTABLE_TONES } from '../setup'

const SEEDS = Array.from({ length: 40 }, (_, i) => i)

describe('tone coupling', () => {
  it('every tone someone can pick has its own status voice', () => {
    // These are lookup keys. A tone renamed in the picker but not here falls
    // back to the warm voice with nothing failing anywhere -- which is what
    // happened when "encouraging" became "uplifting".
    for (const tone of SELECTABLE_TONES) {
      expect(TONES).toContain(tone.value)
    }
  })
})

describe('getStatusMessage', () => {
  it('is stable for the same seed', () => {
    const once = getStatusMessage(STATUS.ONLINE, 'warm', 7)
    expect(getStatusMessage(STATUS.ONLINE, 'warm', 7)).toBe(once)
  })

  it('always returns a message, for every state, tone and seed', () => {
    for (const state of Object.values(STATUS)) {
      for (const tone of TONES) {
        for (const seed of SEEDS) {
          const message = getStatusMessage(state, tone, seed)
          expect(typeof message).toBe('string')
          expect(message.trim()).not.toBe('')
        }
      }
    }
  })

  it('survives an unknown tone and an unknown state', () => {
    expect(getStatusMessage(STATUS.ONLINE, 'nonsense', 3)).toBeTruthy()
    expect(getStatusMessage('made-up-state', 'warm', 3)).toBeTruthy()
  })

  it('survives a negative or fractional seed', () => {
    expect(getStatusMessage(STATUS.ONLINE, 'warm', -12)).toBeTruthy()
    expect(getStatusMessage(STATUS.ONLINE, 'warm', 4.7)).toBeTruthy()
  })

  it('only unlocks the lighter lines at light intensity', () => {
    // Anything not explicitly light -- including undefined -- must draw from
    // the same pool as heavy. Failing open is the one bug here that could
    // land a joke on someone in crisis.
    for (const state of Object.values(STATUS)) {
      for (const tone of TONES) {
        const heavy = new Set(SEEDS.map((s) => getStatusMessage(state, tone, s, INTENSITY.HEAVY)))
        const medium = new Set(SEEDS.map((s) => getStatusMessage(state, tone, s, INTENSITY.MEDIUM)))
        const unknown = new Set(SEEDS.map((s) => getStatusMessage(state, tone, s, undefined)))
        const nonsense = new Set(SEEDS.map((s) => getStatusMessage(state, tone, s, 'whatever')))

        expect([...medium]).toEqual(expect.arrayContaining([...heavy]))
        expect(medium).toEqual(heavy)
        expect(unknown).toEqual(heavy)
        expect(nonsense).toEqual(heavy)
      }
    }
  })

  it('offers more variety when the conversation is light', () => {
    const heavy = new Set(SEEDS.map((s) => getStatusMessage(STATUS.AWAY, 'playful', s, INTENSITY.HEAVY)))
    const light = new Set(SEEDS.map((s) => getStatusMessage(STATUS.AWAY, 'playful', s, INTENSITY.LIGHT)))
    expect(light.size).toBeGreaterThan(heavy.size)
  })

  it('stays lowercase everywhere', () => {
    for (const state of Object.values(STATUS)) {
      for (const tone of TONES) {
        for (const intensity of [INTENSITY.LIGHT, INTENSITY.HEAVY]) {
          for (const seed of SEEDS) {
            const message = getStatusMessage(state, tone, seed, intensity)
            expect(message).toBe(message.toLowerCase())
          }
        }
      }
    }
  })
})

describe('getWaitOffer', () => {
  it('never personalises when the conversation is heavy', () => {
    const offer = getWaitOffer('guitar', 'warm', 3, INTENSITY.HEAVY)
    expect(offer).not.toContain('guitar')
    expect(offer).toBe(getStatusMessage(STATUS.AWAY, 'warm', 3, INTENSITY.HEAVY))
  })

  it('never personalises on an unknown intensity', () => {
    expect(getWaitOffer('guitar', 'warm', 3, undefined)).not.toContain('guitar')
  })

  it('falls back when there is no topic to offer', () => {
    for (const topic of [undefined, null, '', '   ', 42]) {
      expect(getWaitOffer(topic, 'warm', 3, INTENSITY.LIGHT)).toBeTruthy()
    }
  })

  it('uses the topic when the conversation is light or medium', () => {
    for (const intensity of [INTENSITY.LIGHT, INTENSITY.MEDIUM]) {
      const offers = SEEDS.map((s) => getWaitOffer('guitar', 'warm', s, intensity))
      expect(offers.some((offer) => offer.includes('guitar'))).toBe(true)
    }
  })

  it('never asks a question -- a message that cannot be answered must not ask one', () => {
    for (const intensity of [INTENSITY.LIGHT, INTENSITY.MEDIUM]) {
      for (const seed of SEEDS) {
        expect(getWaitOffer('guitar', 'warm', seed, intensity)).not.toContain('?')
      }
    }
  })
})
