/**
 * ChatScreen copy.
 *
 * Same rule as the rest of copy/: nothing technical reaches the user, and
 * an error never blames them for what the app couldn't do.
 */

export const CHAT_COPY = {
  placeholder: 'type a message...',
  send: '[ send ]',
  sending: '[ ... ]',

  aboutLabel: 'about me',
  quirksButton: '[ what you know about me ]',
  clearButton: '[ clear this chat ]',
  clearing: '[ clearing... ]',

  /**
   * Clearing can't be undone, so it takes two steps. Not a modal --
   * a dialog that seizes the screen is a jump scare in a room this quiet.
   * The question sits in the panel where the button was.
   */
  clearConfirm: 'clear this chat?',
  clearConfirmNote: 'your companion and what they know stay.',
  clearYes: '[ yes, clear it ]',
  clearNo: '[ nevermind ]',

  /**
   * Shown in an empty chat window. Not a prompt to perform -- someone
   * opening this at 2am shouldn't be asked a question straight away.
   */
  empty: "whenever you're ready. no rush, nothing you have to say.",

  /**
   * A send that fails is not the companion going away -- they're still
   * there, the message just didn't make it. Say that, and say the words
   * weren't lost, because that's the first thing someone will fear.
   */
  sendFailed: "that didn't go through — your message is still here 💙",
  retry: '[ try again ]',

  /**
   * Distinct from the above: nothing reached the app at all. The action
   * says "reconnect", not "try again", because trying the same message
   * again isn't what's needed -- the link itself has to come back first.
   */
  offline: "couldn't reach me just then — your message is still here 💙",
  reconnect: '[ reconnect ]',
  reconnecting: '[ reconnecting... ]',
  /** The link came back. Never auto-send someone's words for them. */
  backOnline: "back with you — send that whenever you're ready 💙",
  stillOffline: "still can't reach me — your message is safe here 💙",

  clearFailed: "couldn't clear that just now — try again?",
}
