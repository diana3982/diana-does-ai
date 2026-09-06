/**
 * "About quirks" — the explainer shown inside QuirksPanel.
 *
 * A system that quietly learns about you has to be able to explain itself.
 * Someone should be able to open this panel and understand, in ten seconds:
 * what was noticed, where it lives, and how to make it go away.
 *
 * Plain language only. No "data collection", no "profile", no "processing".
 * Those words are accurate and they are also exactly what makes people feel
 * watched. Say what happens instead.
 */

export const ABOUT_QUIRKS = {
  title: 'about quirks',

  /** The short version, always visible at the top of the panel. */
  summary:
    "As you talk, your companion notices things you care about — music you love, food you don't, whatever comes up. That's what's listed here.",

  /** The longer explanation, behind a "tell me more" expander. */
  sections: [
    {
      heading: 'what gets noticed',
      body: "Topics you mention, and roughly how you feel about them. Nothing you say is stored word for word here — just the topic, and whether it sounded like something you love, like, or would rather avoid.",
    },
    {
      heading: 'how sure your companion is',
      body: "Mention something once and it's a guess (LOW). Mention it a few times and your companion gets more confident (MEDIUM, then HIGH). Only the confident ones shape how they talk to you — a single guess never does.",
    },
    {
      heading: 'where this lives',
      body: "On your device. Your quirks are saved locally and go nowhere else — not to a server, not to a backup, not into the app's code. If you delete the app, they're gone with it.",
    },
    {
      heading: 'forgetting something',
      body: "Hit [ forget ] on anything here and it's removed immediately — from this list and from what your companion knows. You don't have to explain why, and nothing asks you to confirm.",
    },
  ],

  /** Shown when the list is empty. */
  empty: "nothing yet — just keep talking 💙",

  /** Sits at the bottom of the panel, under the list. */
  footer: "This is everything your companion knows about you. If something here doesn't feel right, forget it.",
}
