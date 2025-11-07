import { OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'

import { ONE_CLICK_BASE_URL } from '../constants'

let isInitialized = false

/**
 * Initialize the 1Click SDK with API key (JWT token)
 * Must be called before using OneClickService
 *
 * TODO(gomes): Remove this check when we have the actual API key
 * For now, we gracefully handle the pending state
 */
export const initializeOneClickService = (apiKey: string) => {
  if (isInitialized) return

  // TODO(gomes): Remove this check when we get the JWT token
  // Temporary: Don't initialize if API key is placeholder
  if (!apiKey || apiKey === 'requested-now-we-wait') {
    console.warn('[NEAR Intents] Waiting for API key from NEAR Intents team')
    return
  }

  OpenAPI.BASE = ONE_CLICK_BASE_URL
  OpenAPI.TOKEN = apiKey

  isInitialized = true
}

// Re-export the service for convenience
export { OneClickService }
