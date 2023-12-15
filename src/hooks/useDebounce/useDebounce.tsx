import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delayMilliseconds: number, leading = true): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const [skipLeading, setSkipLeading] = useState(leading)

  useEffect(() => {
    const handler = skipLeading
      ? null
      : setTimeout(() => {
          setDebouncedValue(value)
        }, delayMilliseconds)

    if (skipLeading) {
      setDebouncedValue(value)
      setSkipLeading(false)
    }

    return () => {
      if (handler) {
        clearTimeout(handler)
      }
    }
  }, [value, delayMilliseconds, skipLeading, leading])

  useEffect(() => {
    // Reset the skip leading directive when the delay or leading option changes
    setSkipLeading(leading)
  }, [leading, delayMilliseconds])

  return debouncedValue
}
