import { useEffect, useRef, useState } from 'react'
import { APP_COPY } from '../copy/app'
import { TEXT_SIZES, applyTextSize, readTextSize, storeTextSize } from '../lib/textSize'
import './SettingsMenu.css'

/**
 * The settings menu in the title bar — old-OS menu, not a scattered row of
 * controls.
 *
 * It holds text size today and is shaped to hold more: each setting gets its
 * own labelled group, so adding one never rearranges the others.
 *
 * Deliberately a flat menu with headings rather than a hover flyout. This
 * whole menu exists because someone couldn't read the screen, and a flyout
 * that opens on hover and closes when the pointer drifts is exactly the kind
 * of control that is hardest for the people most likely to need it.
 *
 * It sits in the title bar rather than behind a settings screen so it is
 * reachable on the FIRST screen — a preference kept behind a page you cannot
 * comfortably read is no preference at all.
 */
function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState(readTextSize)
  const menuRef = useRef(null)

  const choose = (key) => {
    setSize(applyTextSize(key))
    storeTextSize(key)
  }

  // Same dismissal the clear confirmation uses: mousedown rather than click,
  // so it feels dismissed the moment the pointer goes down.
  useEffect(() => {
    if (!open) return undefined

    const dismiss = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [open])

  // Escape closes without needing to find the trigger again.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <div className="settings-menu" ref={menuRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`settings-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">⚙ </span>
        {APP_COPY.settings.menuLabel}
      </button>

      {open && (
        <div className="settings-panel">
          <p className="settings-heading" id="settings-text-size">
            {APP_COPY.settings.textSizeLabel}
          </p>
          <div className="settings-options" role="group" aria-labelledby="settings-text-size">
            {TEXT_SIZES.map(({ key }) => (
              <button
                key={key}
                type="button"
                className={`settings-size settings-size-${key}${size === key ? ' is-current' : ''}`}
                // The current size is state, not a different button, so a
                // screen reader announces it as pressed rather than renaming.
                aria-pressed={size === key}
                onClick={() => choose(key)}
              >
                {APP_COPY.settings.textSizes[key]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsMenu
