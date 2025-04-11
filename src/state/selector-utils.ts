import isEqual from 'lodash/isEqual'
import { createSelectorCreator, lruMemoize } from 'reselect'

// memoize selector output with lodash isEqual
export const createDeepEqualOutputSelector = createSelectorCreator(lruMemoize, {
  resultEqualityCheck: isEqual,
})
