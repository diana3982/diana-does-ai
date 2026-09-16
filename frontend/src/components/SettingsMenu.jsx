import { useEffect, useRef, useState } from 'react'
import { APP_COPY } from '../copy/app'
import { BOLD_OPTIONS, boldText } from '../lib/boldText'
import { TEXT_SIZES, textSize } from '../lib/textSize'
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

/**
 * Every setting the menu shows, in the order it shows them.
 *
 * Each one is just a key, its values, and the preference that remembers it;
 * the labels come from `copy/` under the same key. The menu renders this
 * list, so a third setting is an entry here and a label there — no new
 * markup, no new state, and no chance of the two drifting.
 */
const SECTIONS = [
  { key: 'textSize', values: TEXT_SIZES.map((size) => size.key), preference: textSize },
  { key: 'boldText', values: BOLD_OPTIONS, preference: boldText },
]

/** What each setting is currently on. Read once, when the menu first mounts. */
const readAll = () =>
  Object.fromEntries(SECTIONS.map(({ key, preference }) => [key, preference.read()]))

function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [openSection, setOpenSection] = useState(null)
  const [chosen, setChosen] = useState(readAll)
  const menuRef = useRef(null)

  const closeAll = () => {
    setOpen(false)
    setOpenSection(null)
  }

  const choose = ({ key, preference }, value) => {
    // Applied before it is stored: the screen changing is the thing the
    // person asked for, and it should not wait on storage that might refuse.
    setChosen((current) => ({ ...current, [key]: preference.apply(value) }))
    preference.store(value)
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
          {SECTIONS.map((section) => {
            const { key, values } = section
            const { label, values: labels } = APP_COPY.settings.sections[key]
            const isOpen = openSection === key

            return (
              <div className="settings-item" key={key}>
                <button
                  type="button"
                  className={`settings-section${isOpen ? ' is-open' : ''}`}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => setOpenSection(isOpen ? null : key)}
                >
                  {label}
                  <span className="settings-arrow" aria-hidden="true">▸</span>
                </button>

                {isOpen && (
                  <div className="settings-submenu" role="group" aria-label={label}>
                    {values.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`settings-value settings-value-${value}${chosen[key] === value ? ' is-current' : ''}`}
                        // The chosen one is announced as state. Colour marks
                        // it visually -- deliberately not weight, which would
                        // read as "selected" and collide with bold letters.
                        aria-pressed={chosen[key] === value}
                        onClick={() => choose(section, value)}
                      >
                        {labels[value]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SettingsMenu
