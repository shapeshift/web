import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import ResizeObserver from 'resize-observer-polyfill'

type ResizeObserverReturn = {
  setNode: Dispatch<SetStateAction<HTMLDivElement | null>>
  entry?: ResizeObserverEntry
}

export const useResizeObserver = (): ResizeObserverReturn => {
  const [observerEntry, setObserverEntry] = useState<ResizeObserverEntry>()
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const observer = useRef<ResizeObserver | null>(null)

  const disconnect = useCallback(() => observer.current?.disconnect(), [])

  const observe = useCallback(() => {
    observer.current = new ResizeObserver(([entry]) => setObserverEntry(entry))
    if (node) observer.current.observe(node)
  }, [node])

  useLayoutEffect(() => {
    observe()
    return () => disconnect()
  }, [disconnect, observe])

  return {
    setNode,
    entry: observerEntry,
  }
}
