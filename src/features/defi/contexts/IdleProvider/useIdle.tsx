import { useContext } from 'react'

import { IdleContext } from './IdleProvider'

export const useIdle = () => {
  const context = useContext(IdleContext)
  if (!context) throw new Error("useIdle can't be used outside of the IdleProvider")
  return context
}
