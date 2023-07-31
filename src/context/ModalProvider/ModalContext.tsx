import { createContext } from 'react'

import { MODAL_KEYS } from './constants'
import type { BaseProps, ModalContext, Modals } from './types'

export const modalContext: ModalContext = MODAL_KEYS.reduce<ModalContext>(
  (acc, key: keyof Modals) => ({
    ...acc,
    // blatant cast as we inject the correct props during provider creation in ModalContainer
    [key]: createContext<BaseProps<keyof Modals>>({} as BaseProps<keyof Modals>),
  }),
  {} as ModalContext,
)
