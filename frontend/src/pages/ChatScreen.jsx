import { useEffect, useRef, useState } from 'react'
import { resetChat, sendMessage } from '../api/columba'
import CompanionAvatar from '../components/CompanionAvatar'
import MessageBubble from '../components/MessageBubble'
import TitleBar from '../components/TitleBar'
import TypingIndicator from '../components/TypingIndicator'
import { CHAT_COPY } from '../copy/chat'
import { STATS } from '../copy/setup'
import { getStatusMessage, STATUS } from '../copy/status'
import './ChatScreen.css'

/** Textarea grows with what's typed, up to three lines. */
const MAX_INPUT_LINES = 3

/** The two highest stats, for the "about me" panel. */
function topStats(stats = {}) {
  return [...STATS]
    .filter((stat) => typeof stats[stat.key] === 'number')
    .sort((a, b) => stats[b.key] - stats[a.key])
    .slice(0, 2)
}

/**
 * ChatScreen — the buddy-list and chat window.
 *
 * The character comes from App, which already fetched it. No refetch.
 *
 * @param {object} character  the saved companion
 */
function ChatScreen({ character }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState(null)
  const [away, setAway] = useState(false)

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const errorTimer = useRef(null)

  const name = character?.name ?? 'your companion'
  const tone = character?.tone

  /**
   * The status line is chosen once per session and then stays put — it
   * should never change while someone is looking at it. No intensity tag
   * exists yet, so this only ever draws from the `always` pool.
   */
  // Lazy state initialiser, not useMemo — this needs to run exactly once,
  // and useMemo is a performance hint React is free to re-run.
  const [seed] = useState(() => Math.floor(Math.random() * 1000))
  const onlineStatus = getStatusMessage(STATUS.ONLINE, tone, seed)
  const typingStatus = getStatusMessage(STATUS.TYPING, tone, seed)
  const awayStatus = getStatusMessage(STATUS.AWAY, tone, seed)

  useEffect(() => () => clearTimeout(errorTimer.current), [])

  // Follow the conversation down as it grows, including while waiting.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, waiting])

  const showError = (message) => {
    setError(message)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 4000)
  }

  const addMessage = (role, text) =>
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role, text, at: new Date() },
    ])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || waiting) return

    addMessage('user', text)
    setDraft('')
    setWaiting(true)
    setError(null)

    try {
      const data = await sendMessage(text)
      setAway(false)
      addMessage('companion', data.reply)
    } catch (err) {
      console.error('[columba] message failed', err)

      // Take the unsent message back out and put the words in the box.
      // Losing what someone just wrote is the worst possible failure here —
      // they may not have it in them to type it twice.
      setMessages((current) => current.slice(0, -1))
      setDraft(text)

      // status 0 means the request never landed: the companion is away
      // rather than something having gone wrong mid-conversation.
      const unreachable = err?.status === 0
      setAway(unreachable)
      showError(unreachable ? CHAT_COPY.offline : CHAT_COPY.sendFailed)
    } finally {
      setWaiting(false)
      inputRef.current?.focus()
    }
  }

  /** Clears this conversation. The companion and quirks are untouched. */
  const handleClear = async () => {
    setClearing(true)
    try {
      await resetChat()
      setMessages([])
      setError(null)
    } catch (err) {
      console.error('[columba] could not clear the chat', err)
      showError(CHAT_COPY.clearFailed)
    } finally {
      setClearing(false)
    }
  }

  const handleKeyDown = (event) => {
    // Enter sends, Shift+Enter starts a new line.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleDraftChange = (event) => {
    setDraft(event.target.value)

    // Grow to fit, up to MAX_INPUT_LINES, then scroll inside.
    const field = event.target
    field.style.height = 'auto'
    const lineHeight = parseFloat(getComputedStyle(field).lineHeight) || 20
    const padding = field.offsetHeight - field.clientHeight
    field.style.height = `${Math.min(field.scrollHeight, lineHeight * MAX_INPUT_LINES + padding)}px`
  }

  return (
    <div className="chat window">
      <TitleBar title="columba" />

      <div className="chat-body">
        {/* ── Buddy info ─────────────────────────────────────────── */}
        <aside className="chat-sidebar">
          <div className="chat-identity">
            <CompanionAvatar name={name} />
            <p className="chat-name">{name}</p>

            <p className="status-label">
              <span
                className={`status-dot ${away ? 'status-dot-away' : ''}`}
                aria-hidden="true"
              />{' '}
              {away ? STATUS.AWAY : STATUS.ONLINE}
            </p>
            <p className="chat-status-message">{away ? awayStatus : onlineStatus}</p>
          </div>

          <hr className="divider" />

          <div className="chat-about">
            <p className="label">{CHAT_COPY.aboutLabel}</p>
            {character?.tone && <p className="chat-about-line">{character.tone}</p>}
            {topStats(character?.stats).map((stat) => (
              <p className="chat-about-line" key={stat.key}>
                <span aria-hidden="true">{stat.emoji}</span> {stat.label}{' '}
                <span className="chat-about-value">{character.stats[stat.key]}</span>
              </p>
            ))}
          </div>

          <hr className="divider" />

          <div className="chat-sidebar-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={clearing || messages.length === 0}
              onClick={handleClear}
            >
              {clearing ? CHAT_COPY.clearing : CHAT_COPY.clearButton}
            </button>
          </div>
        </aside>

        {/* ── Chat window ────────────────────────────────────────── */}
        <section className="chat-main">
          <div className="chat-history">
            {messages.length === 0 && !waiting && (
              <p className="chat-empty">{CHAT_COPY.empty}</p>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                text={message.text}
                at={message.at}
                companionName={name}
              />
            ))}

            {waiting && <TypingIndicator companionName={name} status={typingStatus} />}

            {/* scroll anchor */}
            <div ref={endRef} />
          </div>

          {error && (
            <p className="notice-error chat-error" role="status">
              {error}
            </p>
          )}

          <div className="chat-composer">
            <label className="sr-only" htmlFor="chat-input">
              message {name}
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              className="textarea chat-input"
              rows="1"
              value={draft}
              disabled={waiting}
              placeholder={CHAT_COPY.placeholder}
              onChange={handleDraftChange}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="btn"
              disabled={waiting || !draft.trim()}
              onClick={handleSend}
            >
              {waiting ? CHAT_COPY.sending : CHAT_COPY.send}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ChatScreen
