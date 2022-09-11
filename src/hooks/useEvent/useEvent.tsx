import { useCallback, useLayoutEffect, useRef } from 'react'
import type { AnyFunction } from 'types/common'

/**
 * A Hook to define an event handler with an always-stable function identity.
 * RFC : https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md
 * Original implementation : https://gist.github.com/diegohaz/695097a06f038a707c3a1b11e4e40195
 * @param callback
 */
export function useEvent<T extends AnyFunction>(callback?: T) {
  const ref = useRef<AnyFunction | undefined>(() => {
    throw new Error('Cannot call an event handler while rendering.')
  })
  useLayoutEffect(() => {
    ref.current = callback
  })
  return useCallback<AnyFunction>((...args) => ref.current?.apply(null, args), []) as T
}
