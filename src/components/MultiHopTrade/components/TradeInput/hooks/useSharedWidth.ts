import { useEffect, useState } from 'react'

export const useSharedWidth = (observedRef: React.MutableRefObject<HTMLDivElement | null>) => {
  const [width, setWidth] = useState<number>()

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setWidth(entry.contentRect.width)
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

  return width
}
