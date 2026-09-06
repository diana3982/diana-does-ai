import './TitleBar.css'

/**
 * The title strip across the top of a panel — old-OS window chrome.
 *
 * The [– □ ×] controls are decorative by default. They render as plain
 * marks, not buttons, unless a handler is passed: a button that looks
 * clickable and does nothing is worse than no button, and screen readers
 * shouldn't announce controls that go nowhere.
 *
 * @param {string} title           text shown in the bar
 * @param {string} [icon]          small glyph before the title
 * @param {() => void} [onClose]   pass to make × a real button
 */
function TitleBar({ title, icon = '🕊️', onClose }) {
  return (
    <div className="titlebar">
      <span className="titlebar-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="titlebar-title">{title}</span>

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
