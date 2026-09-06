import './CompanionAvatar.css'

/**
 * The companion's avatar — a dove in a bordered square, buddy-list style.
 *
 * @param {string} [name]   used for the accessible label
 * @param {'sm'|'lg'} [size]
 */
function CompanionAvatar({ name = 'your companion', size = 'lg' }) {
  return (
    <div className={`avatar avatar-${size}`} role="img" aria-label={`${name}'s avatar`}>
      <span aria-hidden="true">🕊️</span>
    </div>
  )
}

export default CompanionAvatar
