import type { Middleware } from '@reduxjs/toolkit'

// developer QoL: update window.store with the latest state
export const updateWindowStoreMiddleware: Middleware = storeAPI => next => action => {
  const result = next(action)
  if (window) window.store = storeAPI.getState()
  return result
}
