import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BOLD_OPTIONS } from '../lib/boldText'
import { TEXT_SIZES } from '../lib/textSize'

/**
 * The seam between the display preferences and the stylesheet.
 *
 * A preference works by writing a data attribute on <html> and letting CSS
 * match it. Nothing connects the two but a string, so every way this breaks
 * breaks quietly: a renamed attribute, a value with no rule, a token defined
 * and never used, or a rule nested inside :root, which is invalid and does
 * nothing at all. That last one was written in this project and caught by
 * eye rather than by a test.
 *
 * So this reads the CSS as text, the way the backend's guard test reads
 * backend/*.py to check the storage list. It is not a rendering test — it
 * asks only whether the two halves still refer to the same names.
 */

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const APP_CSS = read('../App.css')
const SETTINGS_CSS = read('../components/SettingsMenu.css')

/** The declarations inside one rule, by its selector. */
const ruleBody = (css, selector) => {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return null
  return css.slice(start, css.indexOf('}', start))
}

describe('text size', () => {
  it('has a rule for every size but the base one', () => {
    // `small` is the unscaled default the tokens are written at, so it is
    // the one size with nothing to override.
    for (const { key } of TEXT_SIZES.filter((size) => size.key !== 'small')) {
      expect(APP_CSS).toContain(`:root[data-text-size='${key}']`)
    }
  })
})

describe('bold letters', () => {
  it('has a rule for being on', () => {
    expect(APP_CSS).toContain(`:root[data-bold-text='${BOLD_OPTIONS.at(-1)}']`)
  })

  it('defines the weight token it switches', () => {
    // If the token were only defined, bold would store and apply correctly
    // and change nothing on screen.
    expect(APP_CSS).toContain('--reading-weight:')
  })

  it('reaches the whole app from one rule on body', () => {
    // Applied once, not per component. The first version listed the
    // selectors it judged to be "reading" and so did nothing at all on the
    // create-companion screen -- the screen that prompted this work. An
    // accessibility setting does not get an opinion about which windows
    // deserve it, and a list of selectors is how it acquires one.
    const body = ruleBody(APP_CSS, 'body')
    expect(body).not.toBeNull()
    expect(body).toContain('font-weight: var(--reading-weight)')
  })

  it('leaves the menu that previews it alone', () => {
    // The negative half, and the one weight in the app that must NOT follow
    // the setting: "on" in the submenu is written in the weight it turns on.
    // If these values inherited it, then with bold already on both options
    // would render at 600 and the preview would show nothing -- the control
    // would stop describing itself.
    const value = ruleBody(SETTINGS_CSS, '.settings-value')
    expect(value).not.toBeNull()
    expect(value).toContain('font-weight: 400')
    expect(value).not.toContain('var(--reading-weight)')
  })
})

describe('the rules themselves', () => {
  it('sit at the top level, not nested inside :root', () => {
    // `:root { :root[data-bold-text='on'] { ... } }` is not an error, it is
    // simply ignored -- so the setting would look wired up and do nothing.
    for (const line of APP_CSS.split('\n')) {
      if (line.includes(':root[data-')) expect(line).toBe(line.trimStart())
    }
  })
})
