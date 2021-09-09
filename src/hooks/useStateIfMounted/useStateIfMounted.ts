import { useState } from 'react'

import { useIsComponentMounted } from '../useIsComponentMounted/useIsComponentMounted'

export function useStateIfMounted<T>(initialValue?: T): [T | undefined, (value: T) => void] {
  const isComponentMounted = useIsComponentMounted()
  const [state, setState] = useState(initialValue)
  function newSetState(value: T) {
    if (isComponentMounted.current) {
      setState(value)
    }
  }
  return [state, newSetState]
}
