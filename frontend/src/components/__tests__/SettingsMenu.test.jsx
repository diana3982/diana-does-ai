// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SettingsMenu from '../SettingsMenu'
import TitleBar from '../TitleBar'
import { DEFAULT_TEXT_SIZE } from '../../lib/textSize'
import { DEFAULT_BOLD_TEXT } from '../../lib/boldText'
import { APP_COPY } from '../../copy/app'

/**
 * The settings menu. Three things here are not cosmetic:
 *
 * It lives in the title bar, which renders on the setup screen too — someone
 * who cannot comfortably read the first screen has to be able to fix it
 * before filling anything in.
 *
 * It nests: the top level lists what can be changed, not every possible
 * value. That is what keeps it short as settings are added, so a test pins
 * it rather than leaving it to drift back into a flat list.
 *
 * And the settings it holds are accessibility settings. Each one has to
 * reach the whole page, not just the menu it was chosen in.
 */

// Read from copy/ rather than spelled out here. These labels are writing,
// and writing gets revised -- a test that hardcodes them fails for the wrong
// reason the first time a word changes, which is exactly what happened.
const MENU = APP_COPY.settings.menuLabel
const SIZE = APP_COPY.settings.sections.textSize
const BOLD = APP_COPY.settings.sections.boldText

const trigger = () => screen.getByRole('button', { name: MENU })
const openMenu = () => fireEvent.click(trigger())
const openSection = (section) => fireEvent.click(screen.getByText(section.label))
const pick = (section, key) => fireEvent.click(screen.getByText(section.values[key]))

describe('SettingsMenu', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.textSize
    delete document.documentElement.dataset.boldText
    render(<SettingsMenu />)
  })

  afterEach(cleanup)

  it('stays shut until asked', () => {
    expect(screen.queryByText(SIZE.label)).toBeNull()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })

  it('opens to what can be changed, not to every value', () => {
    openMenu()
    expect(screen.getByText(SIZE.label)).toBeTruthy()
    expect(screen.getByText(BOLD.label)).toBeTruthy()
    // The point of nesting: values are still out of sight.
    expect(screen.queryByText(SIZE.values.small)).toBeNull()
    expect(screen.queryByText(BOLD.values.on)).toBeNull()
  })

  it('shows the values once a setting is opened', () => {
    openMenu()
    openSection(SIZE)
    for (const label of Object.values(SIZE.values)) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  it('opens the submenu on click, never on hover', () => {
    openMenu()
    // Hover menus close when the pointer drifts and cannot be used by
    // touch at all -- hardest for the people this menu exists for.
    fireEvent.mouseOver(screen.getByText(SIZE.label))
    expect(screen.queryByText(SIZE.values.large)).toBeNull()

    openSection(SIZE)
    expect(screen.getByText(SIZE.values.large)).toBeTruthy()
  })

  it('shows one setting at a time, so the panel never becomes a wall', () => {
    openMenu()
    openSection(SIZE)
    openSection(BOLD)
    expect(screen.getByText(BOLD.values.on)).toBeTruthy()
    expect(screen.queryByText(SIZE.values.large)).toBeNull()
  })

  it('changes the size of the whole page, not just the menu', () => {
    openMenu()
    openSection(SIZE)
    pick(SIZE, 'large')
    expect(document.documentElement.dataset.textSize).toBe('large')
  })

  it('turns bold on for the whole page too', () => {
    openMenu()
    openSection(BOLD)
    pick(BOLD, 'on')
    expect(document.documentElement.dataset.boldText).toBe('on')
  })

  it('turns bold back off again', () => {
    openMenu()
    openSection(BOLD)
    pick(BOLD, 'on')
    pick(BOLD, 'off')
    expect(document.documentElement.dataset.boldText).toBe('off')
  })

  it('still shows what every other setting is on', () => {
    // Every setting shares one object of state in the menu, so choosing a
    // value in one could drop what the others were on. Checked by reopening
    // the first setting rather than by reading the page: applying a value
    // writes its attribute either way, so the document would look right
    // while the menu had already forgotten.
    openMenu()
    openSection(SIZE)
    pick(SIZE, 'large')
    openSection(BOLD)
    pick(BOLD, 'on')
    openSection(SIZE)

    expect(screen.getByText(SIZE.values.large).getAttribute('aria-pressed')).toBe('true')
  })

  it('remembers both choices for next time', () => {
    openMenu()
    openSection(SIZE)
    pick(SIZE, 'small')
    openSection(BOLD)
    pick(BOLD, 'on')

    expect(window.localStorage.getItem('columba-text-size')).toBe('small')
    expect(window.localStorage.getItem('columba-bold-text')).toBe('on')
  })

  it('announces the current value as state, not as a different button', () => {
    openMenu()
    openSection(SIZE)
    expect(screen.getByText(SIZE.values[DEFAULT_TEXT_SIZE]).getAttribute('aria-pressed')).toBe(
      'true',
    )

    pick(SIZE, 'large')
    expect(screen.getByText(SIZE.values.large).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(SIZE.values[DEFAULT_TEXT_SIZE]).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('starts bold off, since nothing should change unless it is asked for', () => {
    openMenu()
    openSection(BOLD)
    expect(screen.getByText(BOLD.values[DEFAULT_BOLD_TEXT]).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('closes everything when you click away', () => {
    openMenu()
    openSection(SIZE)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText(SIZE.label)).toBeNull()
  })

  it('closes everything on escape, one predictable way out', () => {
    openMenu()
    openSection(SIZE)
    fireEvent.keyDown(screen.getByText(SIZE.label), { key: 'Escape' })
    expect(screen.queryByText(SIZE.label)).toBeNull()
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
