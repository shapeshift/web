import { Dispatch, useCallback, useEffect, useState } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T | null
): [T | null, Dispatch<T | null>] {
  const [value, setValue] = useState<T | null>(initialValue)
  const [stringValue, setStringValue] = useState<string>('')

  const setItem = (newValue: T | null) => {
    const json = JSON.stringify(newValue)
    setStringValue(json)
    setValue(newValue)
    window.localStorage.setItem(key, json)
  }

  useEffect(() => {
    const existingValue = window.localStorage.getItem(key)
    if (stringValue !== existingValue) {
      setStringValue(existingValue || '')
      setValue(existingValue ? JSON.parse(existingValue) : null)
    }
  }, [key, stringValue])

  const handleStorage = useCallback(
    (event: StorageEvent) => {
      if (event.key === key && event.newValue !== stringValue) {
        setStringValue(event.newValue || '')
        setValue(event.newValue ? JSON.parse(event.newValue) : null)
      }
    },
    [key, stringValue]
  )

  useEffect(() => {
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [handleStorage])

  return [value, setItem]
}
