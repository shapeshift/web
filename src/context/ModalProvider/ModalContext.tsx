import { createContext } from 'react'

import { MODAL_KEYS } from './constants'
import type { BaseProps, Modals, ModalState } from './types'

export const modalContext: ModalState = MODAL_KEYS.reduce<ModalState>(
  (acc, key: keyof Modals) => ({
    ...acc,
    [key]: createContext<BaseProps<keyof Modals>>({} as BaseProps<keyof Modals>),
  }),
  {} as ModalState,
)
