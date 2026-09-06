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
   * Shown in an empty chat window. Not a prompt to perform — someone
   * opening this at 2am shouldn't be asked a question straight away.
   */
  empty: "whenever you're ready. no rush, nothing you have to say.",

  /** From the SPEC error table. */
  sendFailed: 'something went wrong — try again in a moment 💙',
  /** Distinct from the above: the message never left, so say so plainly. */
  offline: "couldn't reach me just then — your message is still here 💙",
  clearFailed: "couldn't clear that just now — try again?",
}
