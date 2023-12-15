import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delayMilliseconds: number, leading = true): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const [isFirstCall, setIsFirstCall] = useState(leading)

  useEffect(() => {
    const handler = isFirstCall
      ? null
      : setTimeout(() => {
          setDebouncedValue(value)
        }, delayMilliseconds)

    if (isFirstCall && leading) {
      setDebouncedValue(value)
      setIsFirstCall(false)
    }

    return () => {
      if (handler) {
        clearTimeout(handler)
      }
    }
  }, [value, delayMilliseconds, isFirstCall, leading])

  useEffect(() => {
    // Reset the first call flag when the delay or leading option changes
    setIsFirstCall(leading)
  }, [leading, delayMilliseconds])

  return debouncedValue
}
