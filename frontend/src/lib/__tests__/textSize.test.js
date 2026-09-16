// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZES,
  applyTextSize,
  initTextSize,
  isTextSize,
  readTextSize,
  storeTextSize,
} from '../textSize'

/**
 * Text size, and the two ways it can go wrong: a stored value that is not
 * one of ours, and a browser that refuses storage outright. Neither may
 * stop the screen rendering -- failing to draw the app over a font
 * preference would be a poor trade, especially for the person who needs
 * the preference.
 */

describe('the sizes themselves', () => {
  it('starts at medium, not at the smallest it has', () => {
    // 15px body was never chosen; it is what got built first, and the first
    // outside user was squinting at it. Small stays available.
    expect(DEFAULT_TEXT_SIZE).toBe('medium')
    expect(TEXT_SIZES[0]).toMatchObject({ key: 'small', scale: 1 })
  })

  it('only gets bigger', () => {
    const scales = TEXT_SIZES.map((size) => size.scale)
    expect(scales).toEqual([...scales].sort((a, b) => a - b))
  })

  it('recognises its own sizes and nothing else', () => {
    expect(isTextSize('large')).toBe(true)
    expect(isTextSize('enormous')).toBe(false)
    expect(isTextSize(null)).toBe(false)
  })
})

describe('remembering the choice', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults when nothing has been chosen', () => {
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE)
  })

  it('remembers a choice across visits', () => {
    storeTextSize('large')
    expect(readTextSize()).toBe('large')
  })

  it('ignores a stored value it does not recognise', () => {
    // A hand-edited value, or one left by an older version.
    window.localStorage.setItem('columba-text-size', 'gigantic')
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE)
  })

  it('survives a browser that refuses to read storage', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE)
  })

  it('survives a browser that refuses to write storage', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    // The size still applies for this visit; it just is not remembered.
    expect(() => storeTextSize('medium')).not.toThrow()
  })
})

describe('applying the choice', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
  })

  it('puts the size on the document root, where the CSS reads it', () => {
    applyTextSize('large')
    expect(document.documentElement.dataset.textSize).toBe('large')
  })

  it('falls back rather than writing something the CSS has no rule for', () => {
    applyTextSize('gigantic')
    expect(document.documentElement.dataset.textSize).toBe(DEFAULT_TEXT_SIZE)
  })

  it('applies what was remembered, as the app starts', () => {
    storeTextSize('medium')
    expect(initTextSize()).toBe('medium')
    expect(document.documentElement.dataset.textSize).toBe('medium')
  })
})
