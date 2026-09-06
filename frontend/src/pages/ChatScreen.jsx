/**
 * ChatScreen — the main chat interface.
 *
 * PHASE 3 builds this out: buddy-info sidebar, scrollable message history,
 * input + send, typing indicator. PHASE 4 adds the QuirksPanel.
 *
 * @param {object} character  the saved companion, from GET /character
 */
function ChatScreen({ character }) {
  return (
    <div className="window" style={{ width: 'min(900px, 100%)' }}>
      <div className="panel-title">🕊️ columba</div>
      <div style={{ padding: 'var(--space-5)' }}>
        <h1 className="app-title">{character?.name ?? 'your companion'}</h1>
        <p className="status-label" style={{ marginTop: 'var(--space-2)' }}>
          <span className="status-dot" /> online
        </p>
        <p className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>
          chat window — phase 3
        </p>
      </div>
    </div>
  )
}

export default ChatScreen
