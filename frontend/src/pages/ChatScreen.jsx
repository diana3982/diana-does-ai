import { useCallback, useEffect, useRef, useState } from 'react'
import { getCharacter, resetChat, sendMessage } from '../api/columba'
import CompanionAvatar from '../components/CompanionAvatar'
import MessageBubble from '../components/MessageBubble'
import TitleBar from '../components/TitleBar'
import TypingIndicator from '../components/TypingIndicator'
import { buildAboutMe } from '../copy/about'
import { CHAT_COPY } from '../copy/chat'
import { getStatusMessage, STATUS } from '../copy/status'
import './ChatScreen.css'

/** Textarea grows with what's typed, up to three lines. */
const MAX_INPUT_LINES = 3

/** How long a passing error sits there before it fades on its own. */
const ERROR_TIMEOUT_MS = 4000

/** How often to quietly check the link while away. */
const RECONNECT_POLL_MS = 5000

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
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  /**
   * `{ text, action }` — action is null, 'retry' or 'reconnect'. Anything
   * with an action stays on screen until it's acted on.
   */
  const [error, setError] = useState(null)
  const [away, setAway] = useState(false)

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const errorTimer = useRef(null)
  const cancelClearRef = useRef(null)
  const confirmRef = useRef(null)

  const name = character?.name ?? 'your companion'
  const tone = character?.tone
  const aboutMe = buildAboutMe(character)

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

  /**
   * Declared above the effects because the reconnect poll uses it.
   *
   * @param {string}  message
   * @param {?string} action  'retry' or 'reconnect'. A notice offering an
   *                          action stays put — an action can't time out
   *                          from under someone who is still reading it.
   */
  // useCallback keeps its identity stable, so the reconnect poll below can
  // depend on it without tearing itself down and restarting every render.
  const showError = useCallback((message, action = null) => {
    setError({ text: message, action })
    clearTimeout(errorTimer.current)
    if (!action) {
      errorTimer.current = setTimeout(() => setError(null), ERROR_TIMEOUT_MS)
    }
  }, [])

  useEffect(() => () => clearTimeout(errorTimer.current), [])

  // Follow the conversation down as it grows, including while waiting.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, waiting])

  // Land on "nevermind" when the confirmation opens. Keyboard users should
  // have to move towards the destructive answer, never away from it.
  useEffect(() => {
    if (confirmingClear) cancelClearRef.current?.focus()
  }, [confirmingClear])

  /**
   * While away, quietly keep checking whether the app is reachable again,
   * and flip the dot back on its own — a buddy list never made you press
   * anything to find out someone came back. Only runs while away: when
   * things are working, sending a message is the health check.
   */
  useEffect(() => {
    if (!away) return undefined

    let cancelled = false
    let timer = null

    const check = async () => {
      // Each run owns the schedule, so a visibility-triggered check and a
      // pending timer can't turn into two loops.
      clearTimeout(timer)
      if (cancelled) return

      // Don't ping on behalf of a tab nobody is looking at. Coming back to
      // the window checks immediately, so nothing feels stale.
      if (document.visibilityState === 'visible') {
        try {
          await getCharacter()
          if (cancelled) return
          setAway(false)
          // Fades on its own — nothing to act on, they just came back.
          showError(CHAT_COPY.backOnline)
          return
        } catch {
          // Still unreachable. Say nothing; the away status already does.
        }
      }

      if (!cancelled) timer = setTimeout(check, RECONNECT_POLL_MS)
    }

    timer = setTimeout(check, RECONNECT_POLL_MS)
    document.addEventListener('visibilitychange', check)

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [away, showError])

  // Clicking anywhere else backs out, the way any confirmation should.
  // mousedown rather than click: it should feel dismissed the moment the
  // pointer goes down, not on the release.
  useEffect(() => {
    if (!confirmingClear) return undefined

    const dismiss = (event) => {
      if (!confirmRef.current?.contains(event.target)) setConfirmingClear(false)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [confirmingClear])

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
    clearTimeout(errorTimer.current)
    setError(null)

    try {
      const data = await sendMessage(text)
      setAway(false)
      addMessage('companion', data.reply)
    } catch (err) {
      console.error('[columba] message failed', err)

      // Take the unsent message back out and put the words in the box.
      // Losing what someone just wrote is the worst possible failure here —
      // they may not have it in them to type it twice. It also means
      // "try again" is just another send: the words are already in place.
      setMessages((current) => current.slice(0, -1))
      setDraft(text)

      // Away is reserved for "the app can't be reached at all" (status 0).
      // A send that fails mid-conversation is not the companion stepping
      // out — they're still right there, so the dot stays on and the
      // failure is reported as what it is: a message that didn't send.
      const unreachable = err?.status === 0
      setAway(unreachable)
      showError(
        unreachable ? CHAT_COPY.offline : CHAT_COPY.sendFailed,
        unreachable ? 'reconnect' : 'retry',
      )
    } finally {
      setWaiting(false)
      inputRef.current?.focus()
    }
  }

  /**
   * Tries the link again, without touching the message. A page refresh
   * would take the draft and the visible conversation with it, so this
   * is a soft reconnect: the cheapest call the backend has, used purely
   * to find out whether anyone's home.
   *
   * The poll above does this on its own every few seconds. This is for
   * someone who doesn't want to wait — pressing it should feel like it
   * did something, which is why it reports back either way.
   */
  const handleReconnect = async () => {
    setReconnecting(true)
    try {
      await getCharacter()
      setAway(false)
      // Deliberately not auto-sending. The words are theirs to send.
      showError(CHAT_COPY.backOnline)
    } catch (err) {
      console.error('[columba] still unreachable', err)
      showError(CHAT_COPY.stillOffline, 'reconnect')
    } finally {
      setReconnecting(false)
    }
  }

  /** Clears this conversation. The companion and quirks are untouched. */
  const handleClear = async () => {
    setClearing(true)
    try {
      await resetChat()
      setMessages([])
      setError(null)
      setConfirmingClear(false)
    } catch (err) {
      console.error('[columba] could not clear the chat', err)
      showError(CHAT_COPY.clearFailed)
      setConfirmingClear(false)
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

  /** Escape backs out of the confirmation — the safe answer, one key away. */
  const handleConfirmKeyDown = (event) => {
    if (event.key === 'Escape') setConfirmingClear(false)
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
            {aboutMe.map((line) => (
              <p className="chat-about-line" key={line}>
                {line}
              </p>
            ))}
          </div>

          <hr className="divider" />

          <div className="chat-sidebar-actions">
            {confirmingClear ? (
              <div
                className="chat-confirm"
                ref={confirmRef}
                role="group"
                aria-label={CHAT_COPY.clearConfirm}
                onKeyDown={handleConfirmKeyDown}
              >
                <p className="chat-confirm-question">{CHAT_COPY.clearConfirm}</p>
                <p className="chat-confirm-note">{CHAT_COPY.clearConfirmNote}</p>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={clearing}
                  onClick={handleClear}
                >
                  {clearing ? CHAT_COPY.clearing : CHAT_COPY.clearYes}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  ref={cancelClearRef}
                  disabled={clearing}
                  onClick={() => setConfirmingClear(false)}
                >
                  {CHAT_COPY.clearNo}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={messages.length === 0}
                onClick={() => setConfirmingClear(true)}
              >
                {CHAT_COPY.clearButton}
              </button>
            )}
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
              <span className="chat-error-text">{error.text}</span>

              {error.action === 'retry' && (
                <button
                  type="button"
                  className="btn btn-ghost chat-error-action"
                  disabled={waiting || !draft.trim()}
                  onClick={handleSend}
                >
                  {CHAT_COPY.retry}
                </button>
              )}

              {error.action === 'reconnect' && (
                <button
                  type="button"
                  className="btn btn-ghost chat-error-action"
                  disabled={reconnecting}
                  onClick={handleReconnect}
                >
                  {reconnecting ? CHAT_COPY.reconnecting : CHAT_COPY.reconnect}
                </button>
              )}
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
              className="btn chat-send"
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
