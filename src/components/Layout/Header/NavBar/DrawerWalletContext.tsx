import React, { createContext, useCallback, useContext, useState } from 'react'

type DrawerWalletContextProps = {
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const DrawerWalletContext = createContext<DrawerWalletContextProps | undefined>(undefined)

export const DrawerWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  return (
    <DrawerWalletContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer }}>
      {children}
    </DrawerWalletContext.Provider>
  )
}

export const useDrawerWalletContext = () => {
  const ctx = useContext(DrawerWalletContext)
  if (!ctx) throw new Error('useDrawerWalletContext must be used within DrawerWalletProvider')
  return ctx
}
