import { useEffect, useState } from 'react'

export const useHasFocus = () => {
  const [hasFocus, setHasFocus] = useState(document.hasFocus())

  useEffect(() => {
    const handleFocus = () => {
      setHasFocus(document.hasFocus())
    }

    window.addEventListener('focus', handleFocus)

    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  return hasFocus
}
