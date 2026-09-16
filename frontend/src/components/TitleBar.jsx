import { useState } from 'react'
import { APP_COPY } from '../copy/app'
import { TEXT_SIZES, applyTextSize, readTextSize, storeTextSize } from '../lib/textSize'
import './TitleBar.css'

/**
 * The title strip across the top of a panel — old-OS window chrome.
 *
 * The [– □ ×] controls are decorative by default. They render as plain
 * marks, not buttons, unless a handler is passed: a button that looks
 * clickable and does nothing is worse than no button, and screen readers
 * shouldn't announce controls that go nowhere.
 *
 * It also carries the text size control, which is why that control works
 * everywhere: this bar is on the setup screen and the chat window both. A
 * first-time user who cannot comfortably read the setup screen can fix it
 * before filling anything in — which was the whole point of adding it.
 *
 * @param {string} title           text shown in the bar
 * @param {string} [icon]          small glyph before the title
 * @param {() => void} [onClose]   pass to make × a real button
 */
function TitleBar({ title, icon = '🕊️', onClose }) {
  // Read straight from storage rather than taken as a prop: nothing above
  // needs to know about it, and threading it through every screen would
  // couple the two pages to a preference neither of them uses.
  const [size, setSize] = useState(readTextSize)

  const choose = (key) => {
    setSize(applyTextSize(key))
    storeTextSize(key)
  }

  return (
    <div className="titlebar">
      <span className="titlebar-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="titlebar-title">{title}</span>

      <span
        className="titlebar-textsize"
        role="group"
        aria-label={APP_COPY.textSize.groupLabel}
      >
        {TEXT_SIZES.map(({ key }) => (
          <button
            key={key}
            type="button"
            className={`titlebar-size titlebar-size-${key}${size === key ? ' is-current' : ''}`}
            // aria-pressed rather than a label change, so the current size
            // is announced as state instead of being read as a different
            // button each time it is pressed.
            aria-pressed={size === key}
            aria-label={APP_COPY.textSize.options[key]}
            onClick={() => choose(key)}
          >
            A
          </button>
        ))}
      </span>

      <span className="titlebar-controls">
        <span aria-hidden="true">–</span>
        <span aria-hidden="true">□</span>
        {onClose ? (
          <button type="button" className="titlebar-close" onClick={onClose} aria-label="close">
            ×
          </button>
        ) : (
          <span aria-hidden="true">×</span>
        )}
      </span>
    </div>
  )
}

export default TitleBar
