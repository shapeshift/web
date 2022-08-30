import { useCallback, useState } from 'react'

// Inspired ty https://usehooks.com/useToggle/
export const useToggle = (initialState: boolean = false): [boolean, () => void] => {
  const [state, setState] = useState<boolean>(initialState)
  const toggle = useCallback((): void => setState(state => !state), [])
  return [state, toggle]
}
