import { useEffect, useState } from 'react'

export const useHasFocus = () => {
  const [hasFocus, setHasFocus] = useState(document.hasFocus())

  useEffect(() => {
    const handleFocus = () => setHasFocus(true)
    const handleBlur = () => setHasFocus(false)
    const handleResume = () => setHasFocus(true)

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('resume', handleResume) // Handle mobile app lifecycle events

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('resume', handleResume)
    }
  }, [])

  return hasFocus
}
