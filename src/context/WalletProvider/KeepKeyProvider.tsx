import { isKeepKey, KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { RadioOption } from 'components/Radio/Radio'
import { useKeepKeyEventHandler } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyEventHandler'
import { useWallet } from 'hooks/useWallet/useWallet'

export enum KeepKeyActions {
  SET_AWAITING_BUTTON_PRESS = 'SET_AWAITING_BUTTON_PRESS',
  SET_UPDATE_STATUS = 'SET_UPDATE_STATUS',
  RESET_STATE = 'RESET_STATE'
}

export type UpdateStatus = 'success' | 'failure' | undefined

export enum DeviceTimeout {
  TenMinutes = '600000',
  FifteenMinutes = '900000',
  TwentyMinutes = '1200000',
  ThirtyMinutes = '1800000',
  FortyFiveMinutes = '2700000',
  SixtyMinutes = '3600000'
}

export const timeoutOptions: RadioOption<DeviceTimeout>[] = [
  {
    value: DeviceTimeout.TenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '10' }]
  },
  {
    value: DeviceTimeout.FifteenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '15' }]
  },
  {
    value: DeviceTimeout.TwentyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '20' }]
  },
  {
    value: DeviceTimeout.ThirtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '30' }]
  },
  {
    value: DeviceTimeout.FortyFiveMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '45' }]
  },
  {
    value: DeviceTimeout.SixtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '60' }]
  }
]

export interface InitialState {
  updateStatus: UpdateStatus
}

const initialState: InitialState = {
  updateStatus: undefined
}

export interface IKeepKeyContext {
  state: InitialState
  dispatch: React.Dispatch<KeepKeyActionTypes>
  reset: () => void
  updateStatus: (status: UpdateStatus) => void
  pinCaching: boolean | undefined
  passphrase: boolean | undefined
  keepKeyWallet: KeepKeyHDWallet | undefined
  deviceTimeout: RadioOption<DeviceTimeout> | undefined
}

export type KeepKeyActionTypes =
  | { type: KeepKeyActions.SET_AWAITING_BUTTON_PRESS; payload: boolean }
  | { type: KeepKeyActions.SET_UPDATE_STATUS; payload: UpdateStatus }
  | { type: KeepKeyActions.RESET_STATE }

const reducer = (state: InitialState, action: KeepKeyActionTypes) => {
  switch (action.type) {
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
  const { state: walletState, dispatch: walletDispatch, load, setAwaitingButtonPress } = useWallet()
  const { wallet } = walletState
  const keepKeyWallet = useMemo(() => (wallet && isKeepKey(wallet) ? wallet : undefined), [wallet])
  const [pinCaching, setPinCaching] = useState<boolean>()
  const [passphrase, setPassphrase] = useState<boolean>()
  const [deviceTimeout, setDeviceTimeout] = useState<RadioOption<DeviceTimeout>>()

  useEffect(() => {
    if (!keepKeyWallet) return
    ;(async () => {
      setPassphrase(keepKeyWallet?.features?.passphraseProtection)
      setPinCaching(
        keepKeyWallet?.features?.policiesList.find(p => p.policyName === 'Pin Caching')?.enabled
      )
      setDeviceTimeout(
        Object.values(timeoutOptions).find(
          // @ts-ignore - waiting on autoLockTimeMs to be added to HDWallet
          t => Number(t.value) === keepKeyWallet?.features?.autoLockTimeMs
        )
      )
    })()
  }, [keepKeyWallet])

  const reset = () => dispatch({ type: KeepKeyActions.RESET_STATE })

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
      updateStatus,
      pinCaching,
      passphrase,
      keepKeyWallet,
      deviceTimeout
    }),
    [deviceTimeout, keepKeyWallet, passphrase, pinCaching, state]
  )

  return <KeepKeyContext.Provider value={value}>{children}</KeepKeyContext.Provider>
}

export const useKeepKey = (): IKeepKeyContext =>
  useContext(KeepKeyContext as React.Context<IKeepKeyContext>)
