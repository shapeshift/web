import React, { createContext, useContext, useMemo, useReducer } from 'react'

export enum KeepKeyActions {
  SET_AWAITING_BUTTON_PRESS = 'SET_AWAITING_BUTTON_PRESS',
  SET_UPDATE_STATUS = 'SET_UPDATE_STATUS',
  RESET_STATE = 'RESET_STATE'
}

export type UpdateStatus = 'success' | 'failure' | undefined

export interface InitialState {
  awaitingButtonPress: boolean
  updateStatus: UpdateStatus
}

const initialState: InitialState = {
  awaitingButtonPress: false,
  updateStatus: undefined
}

export interface IKeepKeyContext {
  state: InitialState
  dispatch: React.Dispatch<KeepKeyActionTypes>
  reset: () => void
}

export type KeepKeyActionTypes =
  | { type: KeepKeyActions.SET_AWAITING_BUTTON_PRESS; payload: boolean }
  | { type: KeepKeyActions.SET_UPDATE_STATUS; payload: UpdateStatus }
  | { type: KeepKeyActions.RESET_STATE }

const reducer = (state: InitialState, action: KeepKeyActionTypes) => {
  switch (action.type) {
    case KeepKeyActions.SET_AWAITING_BUTTON_PRESS:
      return { ...state, awaitingButtonPress: action.payload }
    case KeepKeyActions.SET_UPDATE_STATUS:
      return { ...state, updateStatus: action.payload }
    case KeepKeyActions.RESET_STATE:
      return initialState
    default:
      return state
  }
}

const KeepKeyContext = createContext<IKeepKeyContext | null>(null)

export const KeepKeyProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const reset = () => dispatch({ type: KeepKeyActions.RESET_STATE })

  const value: IKeepKeyContext = useMemo(() => ({ state, dispatch, reset }), [state])

  return <KeepKeyContext.Provider value={value}>{children}</KeepKeyContext.Provider>
}

export const useKeepKey = (): IKeepKeyContext =>
  useContext(KeepKeyContext as React.Context<IKeepKeyContext>)
