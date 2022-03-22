import { Middleware } from '@reduxjs/toolkit'

const log = (message: string, obj: unknown, featureFlag: boolean) => {
  if (featureFlag) {
    // eslint-disable-next-line no-console
    console.log(message, obj)
  }
}

export const logging: Middleware = storeAPI => next => action => {
  const currentState = storeAPI.getState()
  const featureFlag = currentState?.preferences?.featureFlags?.ReduxLogging

  log('redux::dispatching', action, featureFlag)
  let result = next(action)
  log('redux::state', storeAPI.getState(), featureFlag)

  return result
}
