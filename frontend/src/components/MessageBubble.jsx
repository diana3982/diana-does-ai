import './MessageBubble.css'

/** "2:34 PM" — never a date. A chat window is always about right now. */
function formatTime(at) {
  return at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * One message in the history.
 *
 * @param {'user'|'companion'} role
 * @param {string} text
 * @param {Date} at
 * @param {string} [companionName]  shown above companion messages
 */
function MessageBubble({ role, text, at, companionName }) {
  const isUser = role === 'user'

  return (
    <div className={`bubble-row ${isUser ? 'bubble-row-user' : 'bubble-row-companion'}`}>
      {!isUser && companionName && (
        <p className="bubble-sender">
          <span aria-hidden="true">🕊️ </span>
          {companionName}
        </p>
      )}

      <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-companion'}`}>
        {/* whitespace is preserved in CSS, so newlines the user typed survive */}
        <p className="bubble-text">{text}</p>
      </div>

      <p className="bubble-time timestamp">
        <time dateTime={at.toISOString()}>{formatTime(at)}</time>
      </p>
    </div>
  )
}

export default MessageBubble
