import type { PropsWithChildren } from 'react'
import React, { createContext, useContext, useState } from 'react'

import type { DialogProps } from '@/components/Modal/components/Dialog'

type DialogContextType = {
  setIsOpen: (arg: boolean) => void
  isOpen: boolean
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export const useDialog = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}

// Safe version that doesn't throw when used outside dialog context, for the purpose of being used in components that are not wrapped in DialogProvider
// @TODO: remove me when we have a better way to manage dialogs in the future
export const useSafeDialog = () => {
  const context = useContext(DialogContext)
  return (
    context ?? {
      isOpen: false,
      setIsOpen: () => {},
    }
  )
}

export const DialogProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)

  const value: DialogContextType = {
    isOpen,
    setIsOpen,
  }

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

type WithDialogProviderProps = DialogProps

export const withDialogProvider =
  <P extends WithDialogProviderProps>(Component: React.ComponentType<P>) =>
  (props: P) => {
    return (
      <DialogProvider>
        <Component {...props} />
      </DialogProvider>
    )
  }
