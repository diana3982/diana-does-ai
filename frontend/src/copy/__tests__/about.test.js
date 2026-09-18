/**
 * The about-me profile.
 *
 * Two things matter here: every setting someone chose has to be visible
 * (this panel is the only place they see their choices reflected back), and
 * the sentences have to hold together for any of the 5^4 x 5 combinations,
 * not just the ones anyone thought to look at.
 */
import { describe, expect, it } from 'vitest'
import { buildAboutMe } from '../about'
import { STATS, TONES } from '../setup'

/** Every stat set to `value`, derived from STATS so it cannot go stale. */
const allStatsAt = (value) => Object.fromEntries(STATS.map((stat) => [stat.key, value]))

/** A different value per stat, so no two descriptors coincide. */
const spreadStats = () =>
  Object.fromEntries(STATS.map((stat, index) => [stat.key, (index % 5) + 1]))

const character = (overrides = {}) => ({
  name: 'juno',
  tone: 'warm',
  stats: allStatsAt(3),
  ...overrides,
})

describe('buildAboutMe', () => {
  it('says something about every stat there is, however many that is', () => {
    // Derived from STATS rather than a literal. When `creativity` left the
    // list, the old version of this kept passing while the blurb had lost a
    // trait -- it only ever checked the stats it was handed.
    const stats = spreadStats()
    const text = buildAboutMe(character({ stats })).join(' ')

    for (const stat of STATS) {
      expect(text).toContain(stat.descriptors[stats[stat.key]])
    }
  })

  it('never renders a gap where a trait should be', () => {
    // The guard that was missing. buildAboutMe destructured four descriptors
    // by name, so when STATS went from four entries to three the last line
    // read "creatively minded. undefined." into the sidebar -- and all eight
    // tests in this file passed: "undefined" is lowercase, contains no
    // "and", and does not change how many lines come back.
    for (const tone of TONES) {
      for (let value = 1; value <= 5; value += 1) {
        for (const line of buildAboutMe(character({ tone: tone.value, stats: allStatsAt(value) }))) {
          expect(line).not.toContain('undefined')
          // An empty fragment leaves ". ." or a line that is only a stop.
          expect(line).not.toMatch(/\.\s*\./)
          expect(line.trim()).not.toBe('.')
        }
      }
    }
  })

  it('leads with the strongest trait', () => {
    const stats = { ...allStatsAt(1), compassion: 5 }
    const [, second] = buildAboutMe(character({ stats }))
    expect(second.startsWith('overflowing with heart')).toBe(true)
  })

  it('gives every tone its own voice', () => {
    const openers = TONES.map((tone) => buildAboutMe(character({ tone: tone.value }))[0])
    expect(new Set(openers).size).toBe(TONES.length)
  })

  it('never joins two descriptors with "and", which reads as mush', () => {
    // Half the descriptors contain an "and" already: "warm and caring and
    // honest and direct" is what the first draft produced.
    for (const tone of TONES) {
      for (let value = 1; value <= 5; value += 1) {
        const stats = Object.fromEntries(
          STATS.map((stat, index) => [stat.key, index % 2 ? 6 - value : value]),
        )
        const lines = buildAboutMe(character({ tone: tone.value, stats }))
        for (const line of lines) {
          expect(line).not.toMatch(/\band\s+\w+\s+and\s+\w+\s+and\b/)
        }
      }
    }
  })

  it('stays lowercase, like the rest of the copy', () => {
    for (const tone of TONES) {
      for (const line of buildAboutMe(character({ tone: tone.value }))) {
        expect(line).toBe(line.toLowerCase())
      }
    }
  })

  it('falls back to a warm voice for an unknown tone', () => {
    expect(buildAboutMe(character({ tone: 'nonsense' }))[0]).toBe(
      buildAboutMe(character({ tone: 'warm' }))[0],
    )
  })

  it('does not throw on a missing or half-built character', () => {
    expect(() => buildAboutMe(undefined)).not.toThrow()
    expect(() => buildAboutMe({})).not.toThrow()
    expect(buildAboutMe({ stats: { compassion: 4 } })).toHaveLength(3)
  })

  it('clamps stats that fall outside 1-5', () => {
    const lines = buildAboutMe(character({ stats: { compassion: 99, real_talk: -3, humor: 3 } }))
    expect(lines.join(' ')).toContain('overflowing with heart')
    expect(lines.join(' ')).toContain('gentle and careful')
  })
})
