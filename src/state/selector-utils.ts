import isEqual from 'lodash/isEqual'
import { createSelectorCreator, defaultMemoize } from 'reselect'

// memoize selector output with lodash isEqual
export const createDeepEqualOutputSelector = createSelectorCreator(defaultMemoize, {
  resultEqualityCheck: isEqual,
})
