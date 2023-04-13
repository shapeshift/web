import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import type { DependencyList } from 'react'
import { useMemo, useRef } from 'react'

// this hook will only update the output if the output has changed deeply
export const useDeepOutputMemo = <T>(fn: () => T, deps: DependencyList | undefined): T => {
  const memoizedResultRef = useRef<T>(fn())
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const memoizedResult = useMemo<T>(fn, deps)

  const memoizationFn = (prevResult: T, nextResult: T) => {
    return isEqual(prevResult, nextResult)
  }

  if (!memoizationFn(memoizedResultRef.current, memoizedResult)) {
    memoizedResultRef.current = cloneDeep(memoizedResult)
  }

  return memoizedResultRef.current
}
