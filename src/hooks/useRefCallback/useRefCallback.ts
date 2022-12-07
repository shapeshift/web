import { useCallback, useRef } from 'react'
import type { Nullable } from 'types/common'

type RefCallback<T> = {
  onInit: (node: Nullable<T>) => void
  onDestroy?: (node: Nullable<T>) => void
  deps?: any[] // Any dependencies to create a new callback reference
}

// Refs do not work as dependencies on useEffects.
// This will allow a function to be called when the ref.current is initialized or updated
export function useRefCallback<T>({
  onInit,
  onDestroy,
  deps,
}: RefCallback<T>): [Nullable<T>, (node: Nullable<T>) => Nullable<T>] {
  const ref = useRef<Nullable<T>>(null)
  const setRef = useCallback(
    (node: Nullable<T>) => {
      if (ref.current && node) {
        // Make sure to cleanup any events/references added to the last instance
        onDestroy?.(node)
      }
      if (node) {
        onInit(node)
      }
      // Save a reference to the node
      ref.current = node
      return node
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deps],
  )

  return [ref?.current, setRef]
}
