import { useMediaQuery } from '@chakra-ui/react'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { breakpoints } from '@/theme/theme'

export enum ActionCenterTab {
  Recent = 'recent',
  Claims = 'claims',
}

type ActionCenterContextProps = {
  isDrawerOpen: boolean
  activeTab: ActionCenterTab
  setActiveTab: (tab: ActionCenterTab) => void
  openActionCenter: () => void
  openActionCenterClaims: () => void
  closeDrawer: () => void
}

const ActionCenterContext = createContext<ActionCenterContextProps | undefined>(undefined)

export const ActionCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(ActionCenterTab.Recent)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const navigate = useNavigate()

  const openActionCenterOnTab = useCallback(
    (tab: ActionCenterTab) => {
      setActiveTab(tab)
      if (!isLargerThanMd) return navigate('/history')

      setIsDrawerOpen(true)
    },
    [isLargerThanMd, navigate],
  )

  const openActionCenter = useCallback(
    () => openActionCenterOnTab(ActionCenterTab.Recent),
    [openActionCenterOnTab],
  )

  const openActionCenterClaims = useCallback(
    () => openActionCenterOnTab(ActionCenterTab.Claims),
    [openActionCenterOnTab],
  )
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  const value = useMemo(
    () => ({
      isDrawerOpen,
      activeTab,
      setActiveTab,
      openActionCenter,
      openActionCenterClaims,
      closeDrawer,
    }),
    [isDrawerOpen, activeTab, openActionCenter, openActionCenterClaims, closeDrawer],
  )

  return <ActionCenterContext.Provider value={value}>{children}</ActionCenterContext.Provider>
}

export const useActionCenterContext = () => {
  const ctx = useContext(ActionCenterContext)
  if (!ctx) throw new Error('useActionCenterContext must be used within an ActionCenterProvider')
  return ctx
}
