const STORAGE_KEY = 'gcss-crm-chat-v1'
const LEGACY_SESSION_KEY = 'gcss-crm-chat-session'
const MAX_AGE_MS = 7 * 86400000

export type StoredChatMessage = {
  id: string
  role: 'bot' | 'user'
  text: string
}

export type StoredChatState = {
  sessionId: string | null
  contactsDone: boolean
  contactPhone: string
  asked: number[]
  adminReplyAfter: number
  messages: StoredChatMessage[]
  savedAt: number
}

export function loadStoredChat(): StoredChatState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return loadLegacySessionOnly()

    const data = JSON.parse(raw) as StoredChatState
    if (!data || typeof data !== 'object') return null
    if (Date.now() - (data.savedAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!Array.isArray(data.messages)) data.messages = []
    if (!Array.isArray(data.asked)) data.asked = []
    return data
  } catch {
    return null
  }
}

function loadLegacySessionOnly(): StoredChatState | null {
  try {
    const sessionId = sessionStorage.getItem(LEGACY_SESSION_KEY)
    if (!sessionId) return null
    return {
      sessionId,
      contactsDone: false,
      contactPhone: '',
      asked: [],
      adminReplyAfter: 0,
      messages: [],
      savedAt: Date.now(),
    }
  } catch {
    return null
  }
}

export function saveStoredChat(state: StoredChatState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        savedAt: Date.now(),
      }),
    )
    if (state.sessionId) {
      sessionStorage.setItem(LEGACY_SESSION_KEY, state.sessionId)
    }
  } catch {
    /* ignore quota */
  }
}
