// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SettingsMenu from '../SettingsMenu'
import TitleBar from '../TitleBar'

/**
 * The settings menu, and the one thing about it that is not cosmetic: it
 * lives in the title bar, which renders on the setup screen too. Someone who
 * cannot comfortably read the first screen has to be able to fix it before
 * filling anything in, not after finding a settings page they cannot read.
 */

describe('SettingsMenu', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
    render(<SettingsMenu />)
  })

  afterEach(cleanup)

  const open = () => fireEvent.click(screen.getByText(/chat settings/i))

  it('stays shut until asked', () => {
    expect(screen.queryByText('text size')).toBeNull()
    expect(screen.getByText(/chat settings/i).getAttribute('aria-expanded')).toBe('false')
  })

  it('opens to a labelled group rather than a bare list', () => {
    open()
    expect(screen.getByText('text size')).toBeTruthy()
    expect(screen.getByText(/chat settings/i).getAttribute('aria-expanded')).toBe('true')
  })

  it('offers every size', () => {
    open()
    for (const label of ['small', 'medium', 'large']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  it('changes the size of the whole page, not just the menu', () => {
    open()
    fireEvent.click(screen.getByText('large'))
    expect(document.documentElement.dataset.textSize).toBe('large')
  })

  it('remembers the choice for next time', () => {
    open()
    fireEvent.click(screen.getByText('medium'))
    expect(window.localStorage.getItem('columba-text-size')).toBe('medium')
  })

  it('announces the current size as state, not as a different button', () => {
    open()
    expect(screen.getByText('small').getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByText('large'))
    expect(screen.getByText('large').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('small').getAttribute('aria-pressed')).toBe('false')
  })

  it('closes when you click away', () => {
    open()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('text size')).toBeNull()
  })

  it('closes on escape, so nobody has to find the trigger again', () => {
    open()
    fireEvent.keyDown(screen.getByText('text size'), { key: 'Escape' })
    expect(screen.queryByText('text size')).toBeNull()
  })
})

describe('where the menu lives', () => {
  afterEach(cleanup)

  it('is in the title bar, so it is reachable on the setup screen too', () => {
    // The whole reason it is here rather than behind a settings screen.
    render(<TitleBar title="columba" />)
    expect(screen.getByText(/chat settings/i)).toBeTruthy()
  })

  it('leaves the decorative window controls alone', () => {
    render(<TitleBar title="columba" />)
    expect(screen.queryByLabelText('close')).toBeNull()
  })
})
