import { ReducerWithoutAction, useReducer } from 'react'

export const useToggle = (initialState = false) =>
  useReducer<ReducerWithoutAction<boolean>>(state => !state, initialState)
