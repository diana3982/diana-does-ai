import { useEffect, useRef, useState } from 'react'
import { saveCharacter } from '../api/columba'
import StatSlider from '../components/StatSlider'
import TitleBar from '../components/TitleBar'
import { AGES, GENDERS, RANDOM_NAMES, SETUP_COPY, STATS, TONES } from '../copy/setup'
import './SetupScreen.css'

/** Every stat starts in the middle — no default personality is the "right" one. */
const DEFAULT_STATS = { compassion: 3, real_talk: 3, creativity: 3, humor: 3 }

const pick = (items) => items[Math.floor(Math.random() * items.length)]
const roll = () => Math.floor(Math.random() * 5) + 1

/**
 * SetupScreen — first-time companion creation.
 *
 * Never routes itself: on a successful save it calls onCharacterCreated with
 * the saved character and App decides what to show next.
 *
 * @param {(character: object) => void} onCharacterCreated
 */
function SetupScreen({ onCharacterCreated }) {
  const [name, setName] = useState('')
  // No age is pre-selected: defaulting would quietly choose for someone,
  // and there's no age here that's more "normal" than another.
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('gender-neutral')
  const [tone, setTone] = useState('warm')
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [randomized, setRandomized] = useState(false)

  // Errors clear themselves after a moment — an error that sits there is a
  // reprimand. Cleared on unmount so a late timer can't touch dead state.
  const errorTimer = useRef(null)
  useEffect(() => () => clearTimeout(errorTimer.current), [])

  const showError = (message) => {
    setError(message)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 4000)
  }

  const setStat = (key, value) => setStats((current) => ({ ...current, [key]: value }))

  /** Any hand edit means they've taken the wheel — drop the "picked for you" note. */
  const touched = () => setRandomized(false)

  /** Saves the character and hands it up to App. */
  const submit = async (character) => {
    if (!character.name.trim()) {
      showError(SETUP_COPY.nameMissing)
      return
    }

    if (!character.age) {
      showError(SETUP_COPY.ageMissing)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const saved = await saveCharacter({ ...character, name: character.name.trim() })
      onCharacterCreated(saved?.character ?? character)
    } catch (err) {
      // err.detail holds the technical reason — console only, never the UI.
      console.error('[columba] could not save character', err)
      showError(SETUP_COPY.saveFailed)
      setSaving(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    submit({ name, age, gender, tone, stats })
  }

  /**
   * Fills every field with something valid and stops there.
   *
   * It deliberately does NOT submit: you get to see who was picked and
   * change anything before meeting them. Skipping past that would mean
   * the first thing the app did was decide for you.
   */
  const handleRandomize = () => {
    setName(pick(RANDOM_NAMES))
    setAge(pick(AGES).value)
    setGender(pick(GENDERS).value)
    setTone(pick(TONES).value)
    setStats({
      compassion: roll(),
      real_talk: roll(),
      creativity: roll(),
      humor: roll(),
    })
    setError(null)
    setRandomized(true)
  }

  return (
    <div className="setup window">
      <TitleBar title="columba — new companion" />

      <div className="setup-body">
        {/* Left: branding */}
        <aside className="setup-brand">
          <span className="setup-dove" aria-hidden="true">
            🕊️
          </span>
          <h1 className="app-title">COLUMBA</h1>
          <p className="setup-tagline">{SETUP_COPY.tagline}</p>
        </aside>

        {/* Right: the form */}
        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-field">
            <label className="label" htmlFor="companion-name">
              {SETUP_COPY.nameLabel}
            </label>
            <input
              id="companion-name"
              className="input"
              type="text"
              value={name}
              disabled={saving}
              placeholder={SETUP_COPY.namePlaceholder}
              onChange={(event) => {
                setName(event.target.value)
                touched()
              }}
            />
          </div>

          <div className="setup-field">
            <label className="label" htmlFor="companion-age">
              {SETUP_COPY.ageLabel}
            </label>
            <select
              id="companion-age"
              className="select"
              value={age}
              disabled={saving}
              onChange={(event) => {
                setAge(event.target.value)
                touched()
              }}
            >
              <option value="" disabled>
                {SETUP_COPY.agePlaceholder}
              </option>
              {AGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pill groups, not dropdowns — the options are worth seeing. */}
          <fieldset className="setup-field setup-group">
            <legend className="label">{SETUP_COPY.genderLabel}</legend>
            <div className="setup-pills">
              {GENDERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="pill"
                  disabled={saving}
                  aria-pressed={gender === option.value}
                  onClick={() => {
                    setGender(option.value)
                    touched()
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="setup-field setup-group">
            <legend className="label">{SETUP_COPY.toneLabel}</legend>
            <div className="setup-pills">
              {TONES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="pill"
                  disabled={saving}
                  aria-pressed={tone === option.value}
                  onClick={() => {
                    setTone(option.value)
                    touched()
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="setup-field setup-group">
            <legend className="label">{SETUP_COPY.statsLabel}</legend>
            {STATS.map((stat) => (
              <StatSlider
                key={stat.key}
                statKey={stat.key}
                emoji={stat.emoji}
                label={stat.label}
                value={stats[stat.key]}
                descriptor={stat.descriptors[stats[stat.key]]}
                disabled={saving}
                onChange={(value) => {
                  setStat(stat.key, value)
                  touched()
                }}
              />
            ))}
          </fieldset>

          {/* Inline, next to the buttons that failed — never a full page. */}
          {error && (
            <p className="notice-error setup-error" role="status">
              {error}
            </p>
          )}

          {!error && randomized && (
            <p className="setup-note" role="status">
              {SETUP_COPY.randomized}
            </p>
          )}

          <div className="setup-actions">
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={handleRandomize}>
              {SETUP_COPY.randomize}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? SETUP_COPY.submitting : SETUP_COPY.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SetupScreen
