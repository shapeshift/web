import { useContext } from 'react'
import { modalContext } from 'context/ModalProvider/ModalContext'
import type { BaseProps, Modals } from 'context/ModalProvider/types'

export const useModal = <T extends keyof Modals>(modalName: T): BaseProps<T> => {
  return useContext(modalContext[modalName])
}
