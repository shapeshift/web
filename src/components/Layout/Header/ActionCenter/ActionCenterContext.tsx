import { useMediaQuery } from '@chakra-ui/react'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { breakpoints } from '@/theme/theme'

type ActionCenterContextProps = {
  isDrawerOpen: boolean
  openActionCenter: () => void
  closeDrawer: () => void
}

const ActionCenterContext = createContext<ActionCenterContextProps | undefined>(undefined)

export const ActionCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const navigate = useNavigate()

  const openActionCenter = useCallback(() => {
    if (!isLargerThanMd) return navigate('/history')

    setIsDrawerOpen(true)
  }, [isLargerThanMd, navigate])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  const value = useMemo(
    () => ({
      isDrawerOpen,
      openActionCenter,
      closeDrawer,
    }),
    [isDrawerOpen, openActionCenter, closeDrawer],
  )

  return <ActionCenterContext.Provider value={value}>{children}</ActionCenterContext.Provider>
}

export const useActionCenterContext = () => {
  const ctx = useContext(ActionCenterContext)
  if (!ctx) throw new Error('useActionCenterContext must be used within an ActionCenterProvider')
  return ctx
}
