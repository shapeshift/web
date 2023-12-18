import type { Middleware } from 'redux'

import type { ReduxState } from './reducer'

export const createSubscriptionMiddleware = (): {
  middleware: Middleware
  subscribe: (listener: (state: ReduxState) => void) => () => void
} => {
  let currentListeners: ((state: ReduxState) => void)[] = []

  const middleware: Middleware = store => next => action => {
    const result = next(action)
    currentListeners.forEach(listener => listener(store.getState() as ReduxState))
    return result
  }

  const subscribe = (listener: (state: ReduxState) => void) => {
    currentListeners.push(listener)
    return () => {
      currentListeners = currentListeners.filter(l => l !== listener)
    }
  }

  return { middleware, subscribe }
}
