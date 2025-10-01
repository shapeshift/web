import { createContext } from 'react'

import type { ModalContextType } from './types'

/**
 * ModalContext is defined in a separate file to avoid HMR issues.
 * This ensures the context instance remains stable across hot reloads.
 */
export const ModalContext = createContext<ModalContextType | undefined>(undefined)
