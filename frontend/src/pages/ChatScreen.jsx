import { useCallback, useEffect, useRef, useState } from 'react'
import { getCharacter, resetChat, sendMessage } from '../api/columba'
import CompanionAvatar from '../components/CompanionAvatar'
import MessageBubble from '../components/MessageBubble'
import TitleBar from '../components/TitleBar'
import TypingIndicator from '../components/TypingIndicator'
import { buildAboutMe } from '../copy/about'
import { CHAT_COPY } from '../copy/chat'
import { getStatusMessage, stricter, STATUS } from '../copy/status'
import { createSendQueue } from '../lib/sendQueue'
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
  /**
   * How many fragments are sent but still being held, waiting to see
   * whether the thought is finished. Drives the typing indicator: as far
   * as the user is concerned, held and in flight are the same thing.
   */
  const [held, setHeld] = useState(0)
  const [clearing, setClearing] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  /**
   * `{ text, action }` — action is null, 'retry' or 'reconnect'. Anything
   * with an action stays on screen until it's acted on.
   */
  const [error, setError] = useState(null)
  const [away, setAway] = useState(false)
  /**
   * How heavy this conversation has been, as the backend read it. Starts
   * unset, which the copy treats as heavy -- nothing has been said yet, so
   * nothing has earned the lighter lines.
   */
  const [intensity, setIntensity] = useState(null)

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const errorTimer = useRef(null)
  const cancelClearRef = useRef(null)
  const confirmRef = useRef(null)
  /**
   * The send queue, and the two things it needs to read when its timer
   * fires. It outlives every render, so it can't close over `flushBatch`
   * or `waiting` directly — either would be whichever render built it.
   * All three are only touched in effects and event handlers.
   */
  const queueRef = useRef(null)
  const flushRef = useRef(null)
  const waitingRef = useRef(false)

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
  // The online line is deliberately not gated on intensity: it sits on
  // screen the whole time, and a status that rewrites itself while someone
  // is looking at it is unsettling. Making it context-aware is Phase 5.
  const onlineStatus = getStatusMessage(STATUS.ONLINE, tone, seed)
  // These two only appear for a moment, so they can follow the conversation.
  const typingStatus = getStatusMessage(STATUS.TYPING, tone, seed, intensity)
  const awayStatus = getStatusMessage(STATUS.AWAY, tone, seed, intensity)

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

  // Built here rather than during render: it owns timers, so it has to be
  // torn down, and nothing should go out on behalf of a screen that has
  // gone away.
  useEffect(() => {
    queueRef.current = createSendQueue({
      onFlush: (batch) => flushRef.current?.(batch),
      isBusy: () => waitingRef.current,
    })
    return () => {
      queueRef.current?.cancel()
      queueRef.current = null
    }
  }, [])

  // Follow the conversation down as it grows, including while waiting.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, waiting, held])

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

  const addMessage = (role, text, id = crypto.randomUUID()) => {
    setMessages((current) => [...current, { id, role, text, at: new Date() }])
    return id
  }

  /**
   * Sends one held batch as a single turn.
   *
   * The fragments are joined with newlines rather than spaces — they were
   * separate sends, and running them together would change what was said.
   *
   * @param {{id: string, text: string}[]} batch  fragments in the order
   *        they were sent, carrying the id of the bubble each one drew
   */
  const flushBatch = async (batch) => {
    const text = batch.map((fragment) => fragment.text).join('\n')

    setHeld(0)
    setWaiting(true)
    waitingRef.current = true
    clearTimeout(errorTimer.current)
    setError(null)

    try {
      const data = await sendMessage(text)
      setAway(false)
      setIntensity((current) => stricter(current, data.intensity))
      addMessage('companion', data.reply)
    } catch (err) {
      console.error('[columba] message failed', err)

      // Take the unsent messages back out and put the words in the box.
      // Losing what someone just wrote is the worst possible failure here —
      // they may not have it in them to type it twice. It also means
      // "try again" is just another send: the words are already in place.
      // By id, not by position: anything sent while this was in the air is
      // sitting behind it in the list and is still perfectly good.
      const failed = new Set(batch.map((fragment) => fragment.id))
      setMessages((current) => current.filter((message) => !failed.has(message.id)))
      // Anything typed while the send was in the air keeps its place at the
      // end. Nothing they wrote is worth less than anything else they wrote.
      setDraft((current) => (current.trim() ? `${text}\n${current}` : text))

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
      waitingRef.current = false
      inputRef.current?.focus()
    }
  }
  // Refreshed after every render so the queue's timer, whenever it fires,
  // calls the live send rather than one from three renders ago.
  useEffect(() => {
    flushRef.current = flushBatch
  })

  /**
   * Hands the message to the queue rather than the network.
   *
   * Nothing is sent yet, and deliberately so — a second fragment arriving
   * in the next couple of seconds belongs to the same thought. The bubble
   * and the typing indicator both appear immediately, so from the user's
   * side the message has landed and the companion is thinking about it.
   * That is true; it just isn't the whole truth yet.
   */
  const handleSend = () => {
    const text = draft.trim()
    const queue = queueRef.current
    // No queue means the screen hasn't finished mounting. Bail before the
    // bubble goes up, so nothing is shown as sent that never will be.
    if (!text || !queue) return

    const id = addMessage('user', text)
    setDraft('')
    queue.push({ id, text })
    setHeld(queue.size())

    // The box shrinks back on its own — it grew to fit words that are gone.
    if (inputRef.current) inputRef.current.style.height = 'auto'
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
    // Drop anything still being held. Clearing the chat and then watching a
    // held fragment arrive in the empty window would be its own small horror.
    queueRef.current?.cancel()
    setHeld(0)
    setClearing(true)
    try {
      await resetChat()
      setMessages([])
      setError(null)
      setConfirmingClear(false)
      // A cleared chat is a new conversation: nothing said in it yet, so
      // nothing has earned the lighter copy.
      setIntensity(null)
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

    // Still typing — if anything is being held, it keeps being held. This
    // is the whole reason the wait can't live on the backend: only the
    // composer knows this is happening.
    queueRef.current?.noteTyping()

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
            {messages.length === 0 && !waiting && held === 0 && (
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

            {/* Held and in flight look the same from here, on purpose: the
                message has landed either way, and the wait is the companion
                giving them room to finish rather than answering half of it. */}
            {(waiting || held > 0) && (
              <TypingIndicator companionName={name} status={typingStatus} />
            )}

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
                  disabled={!draft.trim()}
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
              placeholder={CHAT_COPY.placeholder}
              onChange={handleDraftChange}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="btn chat-send"
              disabled={!draft.trim()}
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
