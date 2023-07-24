import { useContext } from 'react'
import { modalContext } from 'context/ModalProvider/ModalContext'

export const useModal = (modalName: string) => {
  return useContext(modalContext[modalName])
}
