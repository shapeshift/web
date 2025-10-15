export type ModalStackItem = {
  id: string
}

export type ModalStackContextType = {
  modals: ModalStackItem[]
  registerModal: (id: string) => void
  unregisterModal: (id: string) => void
  getIsHighestModal: (id: string) => boolean
  getHighestModal: () => ModalStackItem | undefined
  getZIndex: (id: string) => number | undefined
}
