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
  expectedWalletUid?: string
}

export const connectAndPairDevice = async ({
  adapter,
  deviceId,
  expectedWalletUid,
}: ConnectAndPairDeviceParams): Promise<GridPlusHDWallet | null> => {
  const wallet = await adapter.connectDevice(deviceId, undefined, expectedWalletUid)

  if (!wallet) {
    return null
  }

  return wallet
}

type PairConnectedDeviceParams = {
  adapter: GridPlusAdapter
  deviceId: string
  pairingCode: string
}

export const pairConnectedDevice = async ({
  adapter,
  deviceId,
  pairingCode,
}: PairConnectedDeviceParams): Promise<{
  wallet: GridPlusHDWallet
  activeWalletId: string
  type: 'external' | 'internal'
}> => {
  await adapter.connectDevice(deviceId)

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
}: FinalizeWalletSetupParams): Promise<void> => {
  const safeCardUuid = safeCardWalletId.replace('gridplus:', '')

  // If activeWalletId is missing, fetch it from the wallet
  let finalWalletUid = activeWalletId
  let finalType = type

  if (finalWalletUid === undefined || finalType === undefined) {
    try {
      const validation = await wallet.validateActiveWallet()
      finalWalletUid = validation.activeWalletId
      finalType = validation.type
    } catch (error) {
      // Silently fail - validation not critical for setup
    }
  }

  // Set expected wallet UID for JIT validation before signing
  if (finalWalletUid && wallet.setExpectedActiveWalletId) {
    wallet.setExpectedActiveWalletId(finalWalletUid)
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

  // Always update the SafeCard's activeWalletId if we have it
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
