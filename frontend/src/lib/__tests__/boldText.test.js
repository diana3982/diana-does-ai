// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { BOLD_OPTIONS, DEFAULT_BOLD_TEXT, boldText } from '../boldText'

/**
 * Bold letters. As with text size, the storage machinery is the factory's
 * and is tested in preference.test.js. What matters here is that it starts
 * off, that it is only ever on or off, and that it reaches the page under
 * the name the CSS is looking for.
 */

describe('bold letters', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.boldText
  })

  it('is off unless someone asks for it', () => {
    // An accessibility setting, not a style one. Nobody who did not ask for
    // heavier text should be handed it.
    expect(DEFAULT_BOLD_TEXT).toBe('off')
    expect(boldText.init()).toBe('off')
  })

  it('is on or off, and nothing in between', () => {
    // No third weight. Every step between normal and bold is one more thing
    // to name, to explain and to get wrong.
    expect(BOLD_OPTIONS).toEqual(['off', 'on'])
    expect(boldText.isValid('bolder')).toBe(false)
  })

  it('writes the attribute the CSS rule is keyed on', () => {
    // App.css matches :root[data-bold-text='on'] to raise --reading-weight.
    // A different attribute name here would do nothing, and do it quietly.
    boldText.apply('on')
    expect(document.documentElement.dataset.boldText).toBe('on')
  })

  it('does not disturb text size, which shares its machinery', () => {
    document.documentElement.dataset.textSize = 'large'
    boldText.apply('on')
    expect(document.documentElement.dataset.textSize).toBe('large')
  })
})
