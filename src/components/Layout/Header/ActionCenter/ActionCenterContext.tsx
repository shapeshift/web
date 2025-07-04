import React, { createContext, useCallback, useContext, useState } from 'react'

type ActionCenterContextProps = {
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const ActionCenterContext = createContext<ActionCenterContextProps | undefined>(undefined)

export const ActionCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  return (
    <ActionCenterContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer }}>
      {children}
    </ActionCenterContext.Provider>
  )
}

export const useActionCenterContext = () => {
  const ctx = useContext(ActionCenterContext)
  if (!ctx) throw new Error('useActionCenterContext must be used within an ActionCenterProvider')
  return ctx
}
