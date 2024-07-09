import { useEffect, useState } from 'react'

export const useSharedHeight = (observedRef: React.MutableRefObject<HTMLDivElement | null>) => {
  const [height, setHeight] = useState(0)

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
  }, [observedRef])

  return height
}
