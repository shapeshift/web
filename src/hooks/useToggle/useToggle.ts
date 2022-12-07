import type { ReducerWithoutAction } from 'react'
import { useReducer } from 'react'

export const useToggle = (initialState = false) =>
  useReducer<ReducerWithoutAction<boolean>>(state => !state, initialState)
