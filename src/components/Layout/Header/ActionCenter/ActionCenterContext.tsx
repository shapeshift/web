import { useMediaQuery } from '@chakra-ui/react'
import React, { createContext, useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router'

import { breakpoints } from '@/theme/theme'

type ActionCenterContextProps = {
  isDrawerOpen: boolean
  openNotifications: () => void
  closeDrawer: () => void
}

const ActionCenterContext = createContext<ActionCenterContextProps | undefined>(undefined)

export const ActionCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const navigate = useNavigate()

  const openNotifications = useCallback(() => {
    if (!isLargerThanMd) return navigate('/history')

    setIsDrawerOpen(true)
  }, [isLargerThanMd])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  return (
    <ActionCenterContext.Provider value={{ isDrawerOpen, openNotifications, closeDrawer }}>
      {children}
    </ActionCenterContext.Provider>
  )
}

export const useActionCenterContext = () => {
  const ctx = useContext(ActionCenterContext)
  if (!ctx) throw new Error('useActionCenterContext must be used within an ActionCenterProvider')
  return ctx
}
