/**
 * SetupScreen — first-time companion creation.
 *
 * PHASE 2 builds this out: name/age/gender/tone fields, four StatSliders,
 * "choose for me", and the POST /character submit.
 *
 * Contract with App.jsx: on a successful save, call
 * onCharacterCreated(character) with the saved character object. App owns
 * the setup-vs-chat decision — this screen never routes itself.
 *
 * @param {(character: object) => void} onCharacterCreated
 */
function SetupScreen({ onCharacterCreated }) {
  return (
    <div className="window" style={{ width: 'min(700px, 100%)' }}>
      <div className="panel-title">🕊️ columba — new companion</div>
      <div style={{ padding: 'var(--space-5)' }}>
        <h1 className="app-title">COLUMBA</h1>
        <p className="muted" style={{ marginTop: 'var(--space-3)' }}>
          a steady presence for anyone navigating their own storm
        </p>
        <p className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>
          setup form — phase 2
        </p>
        {/* Temporary: proves the routing handoff works end to end. */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onCharacterCreated({ name: 'Luna' })}
        >
          [ meet your companion → ]
        </button>
      </div>
    </div>
  )
}

export default SetupScreen
