import type { PropsWithChildren } from 'react'
import React, { createContext, useContext, useState } from 'react'
import type { DialogProps } from 'components/Modal/components/Dialog'

type DialogContextType = {
  snapPoint: string | number
  setSnapPoint: (point: number | string) => void
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

export const DialogProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [snapPoint, setSnapPoint] = useState<string | number>(0.5)
  const [isOpen, setIsOpen] = useState(false)

  const value: DialogContextType = {
    snapPoint,
    setSnapPoint,
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
