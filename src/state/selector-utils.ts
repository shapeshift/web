import equal from 'fast-deep-equal'
import { createSelectorCreator, lruMemoize } from 'reselect'

import { profiler } from '@/lib/performanceProfiler'

// memoize selector output with fast-deep-equal (2-7x faster than lodash/isEqual)
export const createDeepEqualOutputSelector = createSelectorCreator(lruMemoize, {
  resultEqualityCheck: equal,
})

export const createProfiledSelector = <T extends (...args: never[]) => unknown>(
  name: string,
  selector: T,
): T => {
  const profiledSelector = (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now()
    const result = selector(...args) as ReturnType<T>
    const duration = performance.now() - start
    profiler.trackSelector(name, duration)
    return result
  }

  return profiledSelector as T
}
