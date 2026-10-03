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
  openActionCenter: () => void
  openActionCenterClaims: () => void
  closeDrawer: () => void
}

type ActionCenterTabContextProps = {
  activeTab: ActionCenterTab
  setActiveTab: (tab: ActionCenterTab) => void
}

const ActionCenterContext = createContext<ActionCenterContextProps | undefined>(undefined)

// Separate so switching tabs doesn't re-render every action center subscriber
const ActionCenterTabContext = createContext<ActionCenterTabContextProps | undefined>(undefined)

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
      openActionCenter,
      openActionCenterClaims,
      closeDrawer,
    }),
    [isDrawerOpen, openActionCenter, openActionCenterClaims, closeDrawer],
  )

  const tabValue = useMemo(() => ({ activeTab, setActiveTab }), [activeTab])

  return (
    <ActionCenterContext.Provider value={value}>
      <ActionCenterTabContext.Provider value={tabValue}>{children}</ActionCenterTabContext.Provider>
    </ActionCenterContext.Provider>
  )
}

export const useActionCenterContext = () => {
  const ctx = useContext(ActionCenterContext)
  if (!ctx) throw new Error('useActionCenterContext must be used within an ActionCenterProvider')
  return ctx
}

export const useActionCenterTab = () => {
  const ctx = useContext(ActionCenterTabContext)
  if (!ctx) throw new Error('useActionCenterTab must be used within an ActionCenterProvider')
  return ctx
}
