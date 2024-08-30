import { createContext } from 'react'

import { MODAL_KEYS } from './constants'
import type { BaseProps, ModalContextType, Modals, ModalState } from './types'

// @ts-ignore blatant ignore as we inject the correct props during provider creation in ModalContainer
export const modalContext: ModalState = MODAL_KEYS.reduce<ModalContextType>(
  (acc, key: keyof Modals) => ({
    ...acc,
    // blatant cast as we inject the correct props during provider creation in ModalContainer
    [key]: createContext<BaseProps<keyof Modals>>({} as BaseProps<keyof Modals>),
  }),
  {} as ModalContextType,
)
