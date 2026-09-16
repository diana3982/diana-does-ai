// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SettingsMenu from '../SettingsMenu'
import TitleBar from '../TitleBar'
import { DEFAULT_TEXT_SIZE } from '../../lib/textSize'
import { APP_COPY } from '../../copy/app'

/**
 * The settings menu. Two things here are not cosmetic:
 *
 * It lives in the title bar, which renders on the setup screen too — someone
 * who cannot comfortably read the first screen has to be able to fix it
 * before filling anything in.
 *
 * And it nests: the top level lists what can be changed, not every possible
 * value. That is what keeps it short as settings are added, so a test pins
 * it rather than leaving it to drift back into a flat list.
 */

// Read from copy/ rather than spelled out here. These labels are writing,
// and writing gets revised -- a test that hardcodes them fails for the wrong
// reason the first time a word changes, which is exactly what happened.
const MENU = APP_COPY.settings.menuLabel
const TEXT_SIZE = APP_COPY.settings.textSizeLabel

const trigger = () => screen.getByRole('button', { name: MENU })
const openMenu = () => fireEvent.click(trigger())
const openTextSize = () => fireEvent.click(screen.getByText(TEXT_SIZE))

describe('SettingsMenu', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
    render(<SettingsMenu />)
  })

  afterEach(cleanup)

  it('stays shut until asked', () => {
    expect(screen.queryByText(TEXT_SIZE)).toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('opens to what can be changed, not to every value', () => {
    openMenu()
    expect(screen.getByText(TEXT_SIZE)).toBeTruthy()
    // The point of nesting: values are still out of sight.
    expect(screen.queryByText('small')).toBeNull()
    expect(screen.queryByText('large')).toBeNull()
  })

  it('shows the values once a setting is opened', () => {
    openMenu()
    openTextSize()
    for (const label of ['small', 'medium', 'large']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  it('opens the submenu on click, never on hover', () => {
    openMenu()
    // Hover menus close when the pointer drifts and cannot be used by
    // touch at all -- hardest for the people this menu exists for.
    fireEvent.mouseOver(screen.getByText(TEXT_SIZE))
    expect(screen.queryByText('large')).toBeNull()

    openTextSize()
    expect(screen.getByText('large')).toBeTruthy()
  })

  it('changes the size of the whole page, not just the menu', () => {
    openMenu()
    openTextSize()
    fireEvent.click(screen.getByText('large'))
    expect(document.documentElement.dataset.textSize).toBe('large')
  })

  it('remembers the choice for next time', () => {
    openMenu()
    openTextSize()
    fireEvent.click(screen.getByText('small'))
    expect(window.localStorage.getItem('columba-text-size')).toBe('small')
  })

  it('announces the current size as state, not as a different button', () => {
    openMenu()
    openTextSize()
    expect(screen.getByText(DEFAULT_TEXT_SIZE).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByText('large'))
    expect(screen.getByText('large').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(DEFAULT_TEXT_SIZE).getAttribute('aria-pressed')).toBe('false')
  })

  it('closes everything when you click away', () => {
    openMenu()
    openTextSize()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText(TEXT_SIZE)).toBeNull()
  })

  it('closes everything on escape, one predictable way out', () => {
    openMenu()
    openTextSize()
    fireEvent.keyDown(screen.getByText(TEXT_SIZE), { key: 'Escape' })
    expect(screen.queryByText(TEXT_SIZE)).toBeNull()
  })
})

describe('where the menu lives', () => {
  afterEach(cleanup)

  it('is in the title bar, so it is reachable on the setup screen too', () => {
    render(<TitleBar title="columba" />)
    expect(screen.getByRole('button', { name: MENU })).toBeTruthy()
  })

  it('leaves the decorative window controls alone', () => {
    render(<TitleBar title="columba" />)
    expect(screen.queryByLabelText('close')).toBeNull()
  })
})
