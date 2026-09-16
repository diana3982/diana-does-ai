import { useEffect, useRef, useState } from 'react'
import { APP_COPY } from '../copy/app'
import { TEXT_SIZES, applyTextSize, readTextSize, storeTextSize } from '../lib/textSize'
import './SettingsMenu.css'

/**
 * The settings menu in the title bar — old-OS menu, not a row of loose
 * controls.
 *
 * Nested on purpose: the top level lists only the names of settings, and
 * values appear when one is opened. With a second or third setting a flat
 * list becomes a wall of options, while this still shows a short list.
 *
 * Submenus open on CLICK, never on hover. Hover menus close when the pointer
 * drifts, which is hardest for exactly the people this menu exists for — and
 * they can't be used by touch at all. Clicking keeps it open until it is
 * dismissed, and works the same from a keyboard.
 *
 * It sits in the title bar rather than behind a settings screen so it is
 * reachable on the FIRST screen — a preference kept behind a page you cannot
 * comfortably read is no preference at all.
 */
function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [openSection, setOpenSection] = useState(null)
  const [size, setSize] = useState(readTextSize)
  const menuRef = useRef(null)

  const closeAll = () => {
    setOpen(false)
    setOpenSection(null)
  }

  const choose = (key) => {
    setSize(applyTextSize(key))
    storeTextSize(key)
  }

  // Same dismissal the clear confirmation uses: mousedown rather than click,
  // so it feels dismissed the moment the pointer goes down.
  useEffect(() => {
    if (!open) return undefined

    const dismiss = (event) => {
      if (!menuRef.current?.contains(event.target)) closeAll()
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [open])

  // Escape closes the whole thing rather than stepping back a level: one
  // predictable way out beats a tidier one nobody can remember.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') closeAll()
  }

  const textSizeOpen = openSection === 'textSize'

  return (
    <div className="settings-menu" ref={menuRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`settings-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? closeAll() : setOpen(true))}
      >
        <span aria-hidden="true">⚙ </span>
        {APP_COPY.settings.menuLabel}
      </button>

      {open && (
        <div className="settings-panel">
          <div className="settings-item">
            <button
              type="button"
              className={`settings-section${textSizeOpen ? ' is-open' : ''}`}
              aria-haspopup="true"
              aria-expanded={textSizeOpen}
              onClick={() => setOpenSection(textSizeOpen ? null : 'textSize')}
            >
              {APP_COPY.settings.textSizeLabel}
              <span className="settings-arrow" aria-hidden="true">▸</span>
            </button>

            {textSizeOpen && (
              <div
                className="settings-submenu"
                role="group"
                aria-label={APP_COPY.settings.textSizeLabel}
              >
                {TEXT_SIZES.map(({ key }) => (
                  <button
                    key={key}
                    type="button"
                    className={`settings-value settings-value-${key}${size === key ? ' is-current' : ''}`}
                    // The chosen one is announced as state. Colour marks it
                    // visually -- deliberately not weight, which would read
                    // as "selected" and collide with the bold setting.
                    aria-pressed={size === key}
                    onClick={() => choose(key)}
                  >
                    {APP_COPY.settings.textSizes[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsMenu
