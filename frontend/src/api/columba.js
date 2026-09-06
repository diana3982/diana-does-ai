/**
 * 🕊️ Columba API client
 *
 * Every call to the Flask backend lives here — components import these
 * functions and never call fetch() directly.
 *
 * Errors: each function throws an ApiError on a non-ok response or a
 * network failure.
 *   err.message — warm, user-facing copy (from the backend, or a fallback)
 *   err.detail  — the technical reason
 *
 * Show err.message plainly. err.detail belongs behind an expander
 * ("what happened?"), never inline — the app stays gentle by default
 * while keeping the real reason reachable for anyone who wants it.
 */

const BASE_URL = 'http://127.0.0.1:5000'

/** Error thrown by every function in this module. */
export class ApiError extends Error {
  constructor(message, { status = 0, detail = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status // HTTP status, or 0 if the request never landed
    this.detail = detail // raw backend message — for debugging, not the UI
  }
}

/**
 * Shared fetch wrapper: sends JSON, parses JSON, throws on failure.
 * @param {string} path      endpoint path, e.g. '/chat'
 * @param {object} [options] { method, body } — body is serialized for you
 */
async function request(path, { method = 'GET', body } = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    // Backend down, CORS, offline — the request never reached Flask.
    throw new ApiError(`Could not reach Columba at ${BASE_URL}`, { detail: cause.message })
  }

  // Flask returns JSON on both success and error, but a crash or proxy
  // can return HTML — don't let a parse failure mask the real status.
  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    // The backend sends { error: <warm message>, detail: <technical> }.
    // Prefer its warm copy; components may still override with their own.
    throw new ApiError(data?.error ?? `${method} ${path} failed`, {
      status: response.status,
      detail: data?.detail ?? data?.error ?? null,
    })
  }

  return data
}

// ─────────────────────────────────────────
// CHARACTER
// ─────────────────────────────────────────

/**
 * Is a companion already configured?
 * @returns {Promise<{exists: boolean, character?: object}>}
 */
export async function getCharacter() {
  return request('/character')
}

/**
 * Save a new companion config (SetupScreen submit).
 * @param {object} character { name, age, gender, tone, stats: {...} }
 * @returns {Promise<{success: boolean, character: object}>}
 */
export async function saveCharacter(character) {
  return request('/character', { method: 'POST', body: character })
}

/**
 * Start over — forget the companion so setup runs again.
 *
 * Quirks are kept by default: they belong to the user, not the companion,
 * so a new companion can carry them forward. Pass { clearQuirks: true } to
 * wipe them instead. Ask before calling this either way.
 *
 * @param {{clearQuirks?: boolean}} [options]
 * @returns {Promise<{success: boolean, existed: boolean, quirks_cleared: boolean}>}
 */
export async function deleteCharacter({ clearQuirks = false } = {}) {
  const query = clearQuirks ? '?clear_quirks=true' : ''
  return request(`/character${query}`, { method: 'DELETE' })
}

// ─────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────

/**
 * Send a message and get the companion's reply.
 * @param {string} message
 * @returns {Promise<{reply: string, history_length: number}>}
 */
export async function sendMessage(message) {
  return request('/chat', { method: 'POST', body: { message } })
}

/**
 * Clear the conversation history on the backend ("start over").
 * @returns {Promise<{success: boolean}>}
 */
export async function resetChat() {
  return request('/chat/reset', { method: 'POST' })
}

// ─────────────────────────────────────────
// QUIRKS
// ─────────────────────────────────────────

/**
 * Everything the companion has learned about the user.
 * @returns {Promise<{quirks: object}>}
 */
export async function getQuirks() {
  return request('/quirks')
}

/**
 * Forget everything the companion has learned, keeping the companion.
 * Separate from starting over — these are two different decisions.
 * @returns {Promise<{success: boolean}>}
 */
export async function clearQuirks() {
  return request('/quirks', { method: 'DELETE' })
}

/**
 * Forget one topic.
 * @param {string} topic  encoded so topics with spaces/slashes still route
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteQuirk(topic) {
  return request(`/quirks/${encodeURIComponent(topic)}`, { method: 'DELETE' })
}
