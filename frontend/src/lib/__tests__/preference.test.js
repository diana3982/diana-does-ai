// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPreference } from '../preference'

/**
 * The shared machinery behind every display preference, tested once here
 * rather than again in each setting that uses it.
 *
 * Two ways a preference can go wrong, and neither may stop the screen
 * rendering: a stored value that is not one of ours, and a browser that
 * refuses storage outright. Failing to draw the app over a font preference
 * would be a poor trade, most of all for the person who needed the
 * preference.
 *
 * Deliberately built on a made-up setting, not on text size or bold. These
 * tests are about the factory; if they used a real one they would start
 * failing when that setting's own values changed.
 */

const STORAGE_KEY = 'columba-test-preference'

const makePreference = () =>
  createPreference({
    storageKey: STORAGE_KEY,
    attribute: 'testPreference',
    values: ['quiet', 'loud'],
    fallback: 'quiet',
  })

describe('createPreference', () => {
  let preference

  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.testPreference
    preference = makePreference()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('recognises its own values and nothing else', () => {
    expect(preference.isValid('loud')).toBe(true)
    expect(preference.isValid('deafening')).toBe(false)
    expect(preference.isValid(null)).toBe(false)
  })

  it('falls back when nothing has been chosen', () => {
    expect(preference.read()).toBe('quiet')
  })

  it('remembers a choice across visits', () => {
    preference.store('loud')
    expect(makePreference().read()).toBe('loud')
  })

  it('ignores a stored value it does not recognise', () => {
    // A hand-edited value, or one left by an older version.
    window.localStorage.setItem(STORAGE_KEY, 'deafening')
    expect(preference.read()).toBe('quiet')
  })

  it('survives a browser that refuses to read storage', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    expect(preference.read()).toBe('quiet')
  })

  it('survives a browser that refuses to write storage', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    // The choice still applies for this visit; it just is not remembered.
    expect(() => preference.store('loud')).not.toThrow()
  })

  it('puts the choice on the document root, where the CSS reads it', () => {
    preference.apply('loud')
    expect(document.documentElement.dataset.testPreference).toBe('loud')
  })

  it('falls back rather than writing something the CSS has no rule for', () => {
    preference.apply('deafening')
    expect(document.documentElement.dataset.testPreference).toBe('quiet')
  })

  it('applies what was remembered, as the app starts', () => {
    preference.store('loud')
    expect(makePreference().init()).toBe('loud')
    expect(document.documentElement.dataset.testPreference).toBe('loud')
  })

  it('keeps two preferences apart', () => {
    // They share a factory but not a key or an attribute -- the mistake
    // this shape would make silently.
    const other = createPreference({
      storageKey: 'columba-other-preference',
      attribute: 'otherPreference',
      values: ['on', 'off'],
      fallback: 'off',
    })

    preference.apply('loud')
    other.apply('on')

    expect(document.documentElement.dataset.testPreference).toBe('loud')
    expect(document.documentElement.dataset.otherPreference).toBe('on')
  })
})
