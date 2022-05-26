import { createLogger } from 'redux-logger'

export const logging = createLogger({
  predicate: getState => getState()?.preferences?.featureFlags?.ReduxLogging,
})
