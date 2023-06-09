import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T | undefined, delayMilliseconds: number): T | undefined {
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
