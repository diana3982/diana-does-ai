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

/**
 * Every place prose is set, and so every place bold has to reach.
 *
 * Named one selector at a time rather than one file at a time. Per file,
 * this check passed while the composer had no weight at all -- ChatScreen.css
 * already satisfied it through the about line, so the file looked wired up
 * and one of its two rules was missing. That is the review comment on #10,
 * turned into the test that would have caught it.
 */
const PROSE_RULES = [
  ['MessageBubble.css', '.bubble-text', read('../components/MessageBubble.css')],
  ['ChatScreen.css', '.chat-about-line', read('../pages/ChatScreen.css')],
  ['ChatScreen.css', '.chat-input', read('../pages/ChatScreen.css')],
]

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

  it('defines the weight token', () => {
    // If the token were only defined, bold would store and apply correctly
    // and change nothing on screen.
    expect(APP_CSS).toContain('--reading-weight:')
  })

  it.each(PROSE_RULES)('reaches %s %s', (file, selector, css) => {
    const body = ruleBody(css, selector)
    expect(body, `${selector} is missing from ${file}`).not.toBeNull()
    expect(body).toContain('font-weight: var(--reading-weight)')
  })
})

describe('the rules themselves', () => {
  it('sits at the top level, not nested inside :root', () => {
    // `:root { :root[data-bold-text='on'] { ... } }` is not an error, it is
    // simply ignored -- so the setting would look wired up and do nothing.
    for (const line of APP_CSS.split('\n')) {
      if (line.includes(':root[data-')) expect(line).toBe(line.trimStart())
    }
  })
})
