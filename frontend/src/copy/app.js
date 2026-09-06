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
}
