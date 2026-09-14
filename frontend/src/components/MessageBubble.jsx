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
 * @param {boolean} [groupStart=true]  first bubble of its turn -- carries the
 *        name. A reply arriving in parts shows the name once, not per part.
 * @param {boolean} [groupEnd=true]    last bubble of its turn -- carries the
 *        time and the full gap below. Earlier parts sit closer together, so
 *        the parts read as one thing being said rather than several.
 *
 * Both default to true, which is exactly how every bubble looked before a
 * reply could arrive in parts: a lone bubble is the start and end of its turn.
 */
function MessageBubble({ role, text, at, companionName, groupStart = true, groupEnd = true }) {
  const isUser = role === 'user'
  const rowClasses = [
    'bubble-row',
    isUser ? 'bubble-row-user' : 'bubble-row-companion',
    groupEnd ? '' : 'bubble-row-continued',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClasses}>
      {!isUser && companionName && groupStart && (
        <p className="bubble-sender">
          <span aria-hidden="true">🕊️ </span>
          {companionName}
        </p>
      )}

      <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-companion'}`}>
        {/* whitespace is preserved in CSS, so newlines the user typed survive */}
        <p className="bubble-text">{text}</p>
      </div>

      {groupEnd && (
        <p className="bubble-time timestamp">
          <time dateTime={at.toISOString()}>{formatTime(at)}</time>
        </p>
      )}
    </div>
  )
}

export default MessageBubble
