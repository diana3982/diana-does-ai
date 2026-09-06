import './TypingIndicator.css'

/**
 * Three soft dots while a reply is on its way, with the companion's own
 * typing status beside them.
 *
 * Announced politely rather than assertively — someone waiting on a hard
 * message shouldn't have a screen reader interrupt them to say "typing".
 *
 * @param {string} [companionName]
 * @param {string} [status]  from getStatusMessage(STATUS.TYPING, tone)
 */
function TypingIndicator({ companionName, status }) {
  return (
    <div className="typing" aria-live="polite">
      <span className="typing-name">
        <span aria-hidden="true">🕊️ </span>
        {companionName}
      </span>

      <span className="typing-dots" aria-hidden="true">
        <span className="typing-dot">·</span>
        <span className="typing-dot" style={{ '--dot-delay': '0.2s' }}>
          ·
        </span>
        <span className="typing-dot" style={{ '--dot-delay': '0.4s' }}>
          ·
        </span>
      </span>

      {status && <span className="typing-status">{status}</span>}
    </div>
  )
}

export default TypingIndicator
