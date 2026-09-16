// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TEXT_SIZE, TEXT_SIZES, textSize } from '../textSize'

/**
 * Text size: what the sizes are and which one someone lands on. How a
 * preference is stored, recovered and applied is the factory's job and is
 * tested in preference.test.js — repeating it here would only mean two
 * places to update.
 */

describe('the sizes themselves', () => {
  it('starts at medium, not at the smallest it has', () => {
    // 15px body was never chosen; it is what got built first, and the first
    // session with an outside user found it hard to read. Small stays
    // available.
    expect(DEFAULT_TEXT_SIZE).toBe('medium')
    expect(TEXT_SIZES[0]).toMatchObject({ key: 'small', scale: 1 })
  })

  it('only gets bigger', () => {
    const scales = TEXT_SIZES.map((size) => size.scale)
    expect(scales).toEqual([...scales].sort((a, b) => a - b))
  })

  it('offers its own sizes and nothing else', () => {
    expect(textSize.isValid('large')).toBe(true)
    expect(textSize.isValid('enormous')).toBe(false)
  })
})

describe('what the page gets', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
  })

  it('lands on medium on a first visit, without anything stored', () => {
    expect(textSize.init()).toBe(DEFAULT_TEXT_SIZE)
    expect(document.documentElement.dataset.textSize).toBe(DEFAULT_TEXT_SIZE)
  })

  it('writes the attribute the CSS rules are keyed on', () => {
    // App.css matches :root[data-text-size='large']; a different attribute
    // name here would apply nothing at all, and silently.
    textSize.apply('large')
    expect(document.documentElement.dataset.textSize).toBe('large')
  })
})
