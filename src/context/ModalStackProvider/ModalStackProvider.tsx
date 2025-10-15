import React, { createContext, useCallback, useMemo, useState } from 'react'

import type { ModalStackContextType, ModalStackItem } from './types'

const ModalStackContext = createContext<ModalStackContextType | undefined>(undefined)

export const ModalStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<ModalStackItem[]>([])

  const registerModal = useCallback((id: string) => {
    setModals(prev => {
      const existingIndex = prev.findIndex(modal => modal.id === id)
      if (existingIndex !== -1) {
        return prev
      }
      const updated = [...prev, { id }]
      return updated
    })
  }, [])

  const unregisterModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id))
  }, [])

  const getIsHighestModal = useCallback(
    (id: string): boolean => {
      if (modals.length === 0) return false
      return modals[modals.length - 1].id === id
    },
    [modals],
  )

  const getZIndex = useCallback(
    (id: string): number | undefined => {
      const index = modals.findIndex(modal => modal.id === id)
      return index !== -1 ? index : undefined
    },
    [modals],
  )

  const getHighestModal = useCallback((): ModalStackItem | undefined => {
    return modals.length > 0 ? modals[modals.length - 1] : undefined
  }, [modals])

  const contextValue = useMemo<ModalStackContextType>(
    () => ({
      modals,
      registerModal,
      unregisterModal,
      getIsHighestModal,
      getHighestModal,
      getZIndex,
    }),
    [modals, registerModal, unregisterModal, getIsHighestModal, getHighestModal, getZIndex],
  )

  return <ModalStackContext.Provider value={contextValue}>{children}</ModalStackContext.Provider>
}

export const useModalStack = (): ModalStackContextType => {
  const context = React.useContext(ModalStackContext)
  if (context === undefined) {
    throw new Error('useModalStack must be used within a ModalStackProvider')
  }
  return context
}
