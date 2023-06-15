import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delayMilliseconds: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMilliseconds)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMilliseconds])

  return debouncedValue
}
