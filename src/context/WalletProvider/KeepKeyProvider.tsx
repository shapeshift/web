import { isKeepKey, KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { useKeepKeyEventHandler } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyEventHandler'
import { useWallet } from 'context/WalletProvider/WalletProvider'

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
  setAwaitingButtonPress: (activeRequest: boolean) => void
  updateStatus: (status: UpdateStatus) => void
  pinCaching: boolean | undefined
  passphrase: boolean | undefined
  keepKeyWallet: KeepKeyHDWallet | undefined
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
  const { state: walletState, dispatch: walletDispatch, load } = useWallet()
  const { wallet } = walletState
  const keepKeyWallet = useMemo(() => (wallet && isKeepKey(wallet) ? wallet : undefined), [wallet])
  const [pinCaching, setPinCaching] = useState<boolean>()
  const [passphrase, setPassphrase] = useState<boolean>()

  useEffect(() => {
    if (!keepKeyWallet) return
    ;(async () => {
      setPassphrase(keepKeyWallet.features?.passphraseProtection)
      setPinCaching(
        keepKeyWallet?.features?.policiesList.find(p => p.policyName === 'Pin Caching')?.enabled
      )
    })()
  }, [keepKeyWallet])

  const reset = () => dispatch({ type: KeepKeyActions.RESET_STATE })
  const setAwaitingButtonPress = (activeRequest: boolean) => {
    dispatch({
      type: KeepKeyActions.SET_AWAITING_BUTTON_PRESS,
      payload: activeRequest
    })
  }

  const updateStatus = (status: UpdateStatus) => {
    dispatch({
      type: KeepKeyActions.SET_UPDATE_STATUS,
      payload: status
    })
  }

  useKeepKeyEventHandler(walletState, walletDispatch, load, setAwaitingButtonPress, updateStatus)

  const value: IKeepKeyContext = useMemo(
    () => ({
      state,
      dispatch,
      reset,
      setAwaitingButtonPress,
      updateStatus,
      pinCaching,
      passphrase,
      keepKeyWallet
    }),
    [keepKeyWallet, passphrase, pinCaching, state]
  )

  return <KeepKeyContext.Provider value={value}>{children}</KeepKeyContext.Provider>
}

export const useKeepKey = (): IKeepKeyContext =>
  useContext(KeepKeyContext as React.Context<IKeepKeyContext>)
