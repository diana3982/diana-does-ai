import './StatSlider.css'

/**
 * A labelled 1–5 slider for one personality stat.
 *
 * The descriptor sits inline after the label — "compassion — steady, not
 * effusive" — and updates as you drag, so the number means something
 * before you ever talk to the companion.
 *
 * @param {string} statKey                 e.g. 'compassion' — used for the input id
 * @param {string} emoji
 * @param {string} label
 * @param {number} value                   1–5
 * @param {string} descriptor              text for the current value
 * @param {(value: number) => void} onChange
 * @param {boolean} [disabled]
 */
function StatSlider({ statKey, emoji, label, value, descriptor, onChange, disabled = false }) {
  const inputId = `stat-${statKey}`
  const descriptorId = `${inputId}-descriptor`

  return (
    <div className="stat-slider">
      <div className="stat-slider-head">
        <label className="stat-slider-label" htmlFor={inputId}>
          <span aria-hidden="true">{emoji}</span> {label}
        </label>

        {/* Reads as "compassion — steady, not effusive" and changes as you
            drag. aria-live announces it; it sits outside the <label> so the
            label's own text stays stable for screen readers. */}
        <span className="stat-slider-descriptor" id={descriptorId} aria-live="polite">
          <span className="stat-slider-dash" aria-hidden="true">
            —{' '}
          </span>
          {descriptor}
        </span>

        <span className="stat-slider-value">{value}</span>
      </div>

      <input
        id={inputId}
        className="stat-slider-input"
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        disabled={disabled}
        aria-describedby={descriptorId}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

export default StatSlider
