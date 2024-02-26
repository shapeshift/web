import { useEffect, useRef, useState } from 'react'

export const useSharedHeight = () => {
  const [height, setHeight] = useState(0)
  const observedRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setHeight(entry.contentRect.height)
      }
    })

    if (observedRef.current) {
      resizeObserver.observe(observedRef.current)
    }

    const currentRef = observedRef.current

    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef)
      }
    }
  }, [])

  return { observedRef, height }
}
