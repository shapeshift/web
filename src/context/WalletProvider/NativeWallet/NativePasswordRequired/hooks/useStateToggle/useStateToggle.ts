import { useState } from 'react'

export const useStateToggle = (): [boolean, () => void] => {
  const [state, setState] = useState<boolean>(false)
  const toggleState = () => setState(s => !s)
  return [state, toggleState]
}
