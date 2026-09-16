/**
 * App-level copy — the screens that exist before there's a companion.
 *
 * Same rules as the rest of copy/: lowercase throughout, nothing
 * technical reaches the user, and an error never blames them for what
 * the app couldn't do.
 */

export const APP_COPY = {
  loading: 'connecting... 🕊️',
  windowTitle: '🕊️ columba',

  /**
   * The one full-page error: the app can't be reached at all. The action
   * matches the chat's away state -- it's the same problem, so it gets
   * the same word.
   */
  errorTitle: "couldn't reach your companion right now 💙",
  errorNote: "take a breath — we can try again whenever you're ready.",
  reconnect: '[ reconnect ]',

  /**
   * Shown only when the backend is running in test mode. Deliberately
   * plain and deliberately loud -- the one place in this app where the
   * point is to interrupt, not to reassure.
   */
  testMode: 'TEST MODE — this session is not real, and nothing here is saved to your companion',

  /**
   * The text size control in the title bar.
   *
   * Shown as three A's of increasing size, which needs no reading to
   * understand -- the point is to be usable by someone who is squinting at
   * the screen right now. The words below are what a screen reader says,
   * and what the button announces when it is the one in use.
   */
  textSize: {
    groupLabel: 'text size',
    options: {
      small: 'small text',
      medium: 'medium text',
      large: 'large text',
    },
  },
}
