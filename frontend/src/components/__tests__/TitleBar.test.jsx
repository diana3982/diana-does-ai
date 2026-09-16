// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import TitleBar from '../TitleBar'

/**
 * The text size control lives here rather than in a settings screen for one
 * reason: this bar is on the setup screen too. Someone who cannot
 * comfortably read the first screen has to be able to fix it before filling
 * anything in, not after finding a settings page they cannot read.
 */

describe('TitleBar — text size', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
    render(<TitleBar title="columba" />)
  })

  afterEach(cleanup)

  it('offers every size, named for a screen reader', () => {
    expect(screen.getByLabelText('small text')).toBeTruthy()
    expect(screen.getByLabelText('medium text')).toBeTruthy()
    expect(screen.getByLabelText('large text')).toBeTruthy()
  })

  it('changes the size of the whole page, not just this bar', () => {
    fireEvent.click(screen.getByLabelText('large text'))
    expect(document.documentElement.dataset.textSize).toBe('large')
  })

  it('remembers the choice for next time', () => {
    fireEvent.click(screen.getByLabelText('medium text'))
    expect(window.localStorage.getItem('columba-text-size')).toBe('medium')
  })

  it('announces which size is in use as state, not as a different button', () => {
    expect(screen.getByLabelText('small text').getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByLabelText('large text'))
    expect(screen.getByLabelText('large text').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByLabelText('small text').getAttribute('aria-pressed')).toBe('false')
  })

  it('leaves the decorative window controls alone', () => {
    // Still marks rather than buttons, since they go nowhere.
    expect(screen.queryByLabelText('close')).toBeNull()
  })
})
