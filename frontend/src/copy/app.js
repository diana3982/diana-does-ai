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
   * The settings menu in the title bar.
   *
   * `menuLabel` is "settings", not "chat settings": this bar renders on the
   * setup screen too, before any chat exists, so a name borrowed from the
   * chat window read early there. It also leaves room for settings that are
   * not about the chat at all.
   *
   * Each value is written the way it looks -- sizes at the size they set,
   * "on" in the weight it turns on -- so the choice can be made by looking
   * rather than by reading. The point is to be usable by someone squinting
   * at the screen right now.
   *
   * Keyed by the setting's own name so the menu can render sections from
   * this object rather than from a list repeated in the component.
   */
  settings: {
    menuLabel: 'settings',
    sections: {
      textSize: {
        label: 'text size',
        values: { small: 'small', medium: 'medium', large: 'large' },
      },
      /* "bold letters", not "bold text" -- the plain-language name, and the
         one UAT user 1 used when asking for it. */
      boldText: {
        label: 'bold letters',
        values: { off: 'off', on: 'on' },
      },
    },
  },
}
