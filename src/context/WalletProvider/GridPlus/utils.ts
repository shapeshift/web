import type { GridPlusAdapter, GridPlusHDWallet } from '@shapeshiftoss/hdwallet-gridplus'
import type { Dispatch } from 'react'
import type { NavigateFunction } from 'react-router-dom'

import { GridPlusConfig } from './config'

import type { ActionTypes } from '@/context/WalletProvider/actions'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import type { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import type { AppDispatch } from '@/state/store'

type LocalWallet = ReturnType<typeof useLocalWallet>

type ConnectAndPairDeviceParams = {
  adapter: GridPlusAdapter
  deviceId: string
  sessionId: string | undefined
  dispatch: AppDispatch
}

export const connectAndPairDevice = async ({
  adapter,
  deviceId,
  sessionId,
  dispatch,
}: ConnectAndPairDeviceParams): Promise<GridPlusHDWallet | null> => {
  if (!sessionId) {
    const { isPaired, sessionId: newSessionId } = await adapter.connectDevice(
      deviceId,
      undefined,
      undefined,
    )

    if (!isPaired) {
      return null
    }

    dispatch(
      gridplusSlice.actions.setConnection({
        physicalDeviceId: deviceId,
        sessionId: newSessionId ?? undefined,
      }),
    )
  }

  const wallet = await adapter.pairDevice(deviceId, undefined, undefined, sessionId ?? undefined)

  if (!sessionId && wallet.getSessionId) {
    const walletSessionId = wallet.getSessionId()
    if (walletSessionId) {
      dispatch(
        gridplusSlice.actions.setConnection({
          physicalDeviceId: deviceId,
          sessionId: walletSessionId,
        }),
      )
    }
  }

  return wallet
}

type PairConnectedDeviceParams = {
  adapter: GridPlusAdapter
  deviceId: string
  pairingCode: string
  dispatch: AppDispatch
}

export const pairConnectedDevice = async ({
  adapter,
  deviceId,
  pairingCode,
  dispatch,
}: PairConnectedDeviceParams): Promise<GridPlusHDWallet> => {
  const wallet = await adapter.pairConnectedDevice(deviceId, pairingCode)

  if (wallet.getSessionId) {
    const walletSessionId = wallet.getSessionId()
    if (walletSessionId) {
      dispatch(
        gridplusSlice.actions.setConnection({
          physicalDeviceId: deviceId,
          sessionId: walletSessionId,
        }),
      )
    }
  }

  return wallet
}

type FinalizeWalletSetupParams = {
  wallet: GridPlusHDWallet
  safeCardWalletId: string
  walletDispatch: Dispatch<ActionTypes>
  localWallet: LocalWallet
  navigate: NavigateFunction
  appDispatch: AppDispatch
}

export const finalizeWalletSetup = ({
  wallet,
  safeCardWalletId,
  walletDispatch,
  localWallet,
  navigate,
  appDispatch,
}: FinalizeWalletSetupParams): void => {
  const safeCardUuid = safeCardWalletId.replace('gridplus:', '')

  walletDispatch({
    type: WalletActions.SET_WALLET,
    payload: {
      wallet,
      name: GridPlusConfig.name,
      icon: GridPlusConfig.icon,
      deviceId: safeCardWalletId,
      connectedType: KeyManager.GridPlus,
    },
  })

  walletDispatch({
    type: WalletActions.SET_IS_CONNECTED,
    payload: true,
  })

  localWallet.setLocalWallet({
    type: KeyManager.GridPlus,
    deviceId: safeCardWalletId,
    rdns: null,
  })

  appDispatch(gridplusSlice.actions.setLastConnectedAt(safeCardUuid))

  walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  navigate('/')
}
