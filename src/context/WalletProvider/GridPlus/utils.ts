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
  expectedActiveWalletId?: string
  expectedType?: 'external' | 'internal'
  dispatch: AppDispatch
}

export const connectAndPairDevice = async ({
  adapter,
  deviceId,
  expectedActiveWalletId,
  expectedType,
  dispatch,
}: ConnectAndPairDeviceParams): Promise<GridPlusHDWallet | null> => {
  const wallet = await adapter.connectDevice(
    deviceId,
    expectedActiveWalletId,
    expectedType,
  )

  if (!wallet) {
    return null
  }

  dispatch(
    gridplusSlice.actions.setConnection({
      physicalDeviceId: deviceId,
      sessionId: null,
    }),
  )

  return wallet
}

type PairConnectedDeviceParams = {
  adapter: GridPlusAdapter
  pairingCode: string
}

export const pairConnectedDevice = async ({
  adapter,
  pairingCode,
}: PairConnectedDeviceParams): Promise<{
  wallet: GridPlusHDWallet
  activeWalletId: string
  type: 'external' | 'internal'
}> => {
  const { wallet, activeWalletId, type } = await adapter.pairDevice(pairingCode)

  return { wallet, activeWalletId, type }
}

type FinalizeWalletSetupParams = {
  wallet: GridPlusHDWallet
  safeCardWalletId: string
  walletDispatch: Dispatch<ActionTypes>
  localWallet: LocalWallet
  navigate: NavigateFunction
  appDispatch: AppDispatch
  activeWalletId?: string
  type?: 'external' | 'internal'
}

export const finalizeWalletSetup = async ({
  wallet,
  safeCardWalletId,
  walletDispatch,
  localWallet,
  navigate,
  appDispatch,
  activeWalletId,
  type,
}: FinalizeWalletSetupParams) => {
  const safeCardUuid = safeCardWalletId.replace('gridplus:', '')

  const { finalWalletUid, finalType } = await (async () => {
    if (activeWalletId !== undefined && type !== undefined) {
      return { finalWalletUid: activeWalletId, finalType: type }
    }

    try {
      const validation = await wallet.validateActiveWallet()
      return { finalWalletUid: validation.activeWalletId, finalType: validation.type }
    } catch (error) {
      return { finalWalletUid: activeWalletId, finalType: type }
    }
  })()

  if (finalWalletUid && wallet.setExpectedActiveWalletId) {
    wallet.setExpectedActiveWalletId(finalWalletUid, finalType)
  }

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

  if (finalWalletUid !== undefined && finalType !== undefined) {
    appDispatch(
      gridplusSlice.actions.updateSafeCardWalletUid({
        id: safeCardUuid,
        activeWalletId: finalWalletUid,
        type: finalType,
      }),
    )
  }

  walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  navigate('/')
}
