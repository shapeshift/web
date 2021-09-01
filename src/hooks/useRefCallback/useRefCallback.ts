import { useCallback, useRef } from 'react'

type RefCallback<T> = {
  onInit: (node: T) => void
  onDestroy?: (node: T) => void
}

// Refs do not work as dependencies on useEffects.
// This will allow a function to be called when the ref.current is initialized or updated
export function useRefCallback<T>({ onInit, onDestroy }: RefCallback<T>) {
  const ref = useRef(null)
  const setRef = useCallback(node => {
    if (ref.current) {
      // Make sure to cleanup any events/references added to the last instance
      onDestroy?.(node)
    }
    if (node) {
      onInit(node)
    }
    // Save a reference to the node
    ref.current = node
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [setRef]
}
