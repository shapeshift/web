import { OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'

import { ONE_CLICK_BASE_URL } from '../constants'

let isInitialized = false

export const initializeOneClickService = (apiKey: string) => {
  if (isInitialized) return

  OpenAPI.BASE = ONE_CLICK_BASE_URL
  // Only set TOKEN if we have a real JWT token
  // Don't set it for placeholder values - API works without auth (charges 0.1% fee)
  if (apiKey && apiKey !== 'requested-now-we-wait') {
    OpenAPI.TOKEN = apiKey
  }

  isInitialized = true
}

// Re-export the service for convenience
export { OneClickService }
