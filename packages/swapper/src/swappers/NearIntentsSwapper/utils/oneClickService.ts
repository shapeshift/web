import { ApiError, OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'

import { ONE_CLICK_BASE_URL } from '../constants'

let isInitialized = false

export const initializeOneClickService = (apiKey: string) => {
  if (isInitialized) return

  OpenAPI.BASE = ONE_CLICK_BASE_URL
  OpenAPI.TOKEN = apiKey

  isInitialized = true
}

// Re-export the service and types for convenience
export { ApiError, OneClickService }
