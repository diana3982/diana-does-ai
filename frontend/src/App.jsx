import { useCallback, useEffect, useState } from 'react'
import { getCharacter } from './api/columba'
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
  const [characterExists, setCharacterExists] = useState(false)
  // The character itself is kept here so ChatScreen can render the
  // companion's name, tone and stats without a second request.
  const [character, setCharacter] = useState(null)
  const [connectionFailed, setConnectionFailed] = useState(false)

  const checkCharacter = useCallback(async () => {
    setLoading(true)
    setConnectionFailed(false)
    try {
      const data = await getCharacter()
      setCharacterExists(Boolean(data?.exists))
      setCharacter(data?.character ?? null)
    } catch (err) {
      // Backend down or the request failed. Never surface err.detail —
      // the user sees warm copy, the details go to the console.
      console.error('[columba] could not load character', err)
      setConnectionFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // `cancelled` keeps a slow response from setting state after unmount
    // (React StrictMode mounts effects twice in development).
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      await checkCharacter()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [checkCharacter])

  /** SetupScreen calls this once POST /character succeeds. */
  const handleCharacterCreated = (savedCharacter) => {
    setCharacter(savedCharacter)
    setCharacterExists(true)
  }

  if (loading) {
    return (
      <div className="app">
        <p className="app-loading pulse">connecting... 🕊️</p>
      </div>
    )
  }

  // Can't reach Flask at all. Warm copy, plus a way back — this is the
  // one full-page error, because there is no screen to fall back to.
  if (connectionFailed) {
    return (
      <div className="app">
        <div className="window" style={{ width: 'min(440px, 100%)' }}>
          <div className="panel-title">🕊️ columba</div>
          <div style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
            <p>Couldn&apos;t reach your companion right now 💙</p>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              Take a breath — we can try again whenever you&apos;re ready.
            </p>
            <button type="button" className="btn" onClick={checkCharacter}>
              [ try again ]
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {characterExists ? (
        <ChatScreen character={character} />
      ) : (
        <SetupScreen onCharacterCreated={handleCharacterCreated} />
      )}
    </div>
  )
}

export default App
