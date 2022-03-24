import { createLogger } from 'redux-logger'
import { ReduxState } from 'state/reducer'

export const loggingMiddleware = createLogger({
  predicate: (getState: () => ReduxState) => getState()?.preferences?.featureFlags?.ReduxLogging,
  diff: true
})
