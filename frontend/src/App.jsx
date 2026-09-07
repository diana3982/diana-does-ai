import { useCallback, useEffect, useState } from 'react'
import { getCharacter } from './api/columba'
import { APP_COPY } from './copy/app'
import ChatScreen from './pages/ChatScreen'
import SetupScreen from './pages/SetupScreen'
import './App.css'

/**
 * 🕊️ Columba
 *
 * Routing is a simple conditional render — no React Router.
 * On mount we ask the backend whether a companion already exists:
 *   exists: false → SetupScreen
 *   exists: true  → ChatScreen
 */
function App() {
  const [loading, setLoading] = useState(true)
  // The character is both the routing decision and the data: a saved
  // companion means ChatScreen, and null means setup. Keeping a separate
  // `exists` flag alongside it was two variables holding one fact, which
  // is two things that can disagree. It also means ChatScreen is only
  // ever rendered when there is actually a companion to render.
  const [character, setCharacter] = useState(null)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [testMode, setTestMode] = useState(false)

  const checkCharacter = useCallback(async () => {
    // Deliberately does not reset `loading` or `connectionFailed` itself.
    // On mount those already hold the values it would set, so setting them
    // is a no-op that makes this an effect which re-renders synchronously.
    // They belong to the retry below, which is the only caller that needs
    // to put the screen back to loading.
    try {
      const data = await getCharacter()
      setCharacter(data?.exists ? (data.character ?? null) : null)
      setTestMode(Boolean(data?.test_mode))
    } catch (err) {
      // Backend down or the request failed. Never surface err.detail —
      // the user sees warm copy, the details go to the console.
      console.error('[columba] could not load character', err)
      setConnectionFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  /** The reconnect button: back to the loading screen, then ask again. */
  const retryConnection = () => {
    setLoading(true)
    setConnectionFailed(false)
    checkCharacter()
  }

  // The async wrapper is the shape react-hooks/set-state-in-effect asks
  // for: an effect body may not call something that sets state, and this
  // is how React's own docs write "kick off a fetch on mount".
  //
  // What it is NOT is a cancellation guard. The version that lived here
  // carried a `cancelled` flag it read before its first await, so the flag
  // could never be true and protected nothing -- and App is the root, so
  // there is no unmount to protect against anyway. A guard that looks like
  // safety and isn't is worse than none, because the next person trusts it.
  useEffect(() => {
    const run = async () => {
      await checkCharacter()
    }
    run()
  }, [checkCharacter])

  /** SetupScreen calls this once POST /character succeeds. */
  const handleCharacterCreated = (savedCharacter) => {
    setCharacter(savedCharacter)
  }

  if (loading) {
    return (
      <div className="app">
        <p className="app-loading pulse">{APP_COPY.loading}</p>
      </div>
    )
  }

  // Can't reach Flask at all. Warm copy, plus a way back — this is the
  // one full-page error, because there is no screen to fall back to.
  if (connectionFailed) {
    return (
      <div className="app">
        <div className="window" style={{ width: 'min(440px, 100%)' }}>
          <div className="panel-title">{APP_COPY.windowTitle}</div>
          <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
            <p>{APP_COPY.errorTitle}</p>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {APP_COPY.errorNote}
            </p>
            {/* Deliberately manual, unlike the chat's away poll. Nothing is
                held here yet — no draft, no conversation — so there's
                nothing for a poll to protect, and dropping someone into
                the app mid-sentence would be worse than a button. */}
            <button type="button" className="btn" onClick={retryConnection}>
              {APP_COPY.reconnect}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* A test session must never be mistaken for a real one. */}
      {testMode && <p className="test-mode-banner">{APP_COPY.testMode}</p>}
      {character ? (
        <ChatScreen character={character} />
      ) : (
        <SetupScreen onCharacterCreated={handleCharacterCreated} />
      )}
    </div>
  )
}

export default App
