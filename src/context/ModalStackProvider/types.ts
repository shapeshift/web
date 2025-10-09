export type ModalStackItem = {
  id: string
}

export type ModalStackContextType = {
  modals: ModalStackItem[]
  registerModal: (id: string) => number
  unregisterModal: (id: string) => void
  isTopModal: (id: string) => boolean
  getTopModal: () => ModalStackItem | undefined
}
