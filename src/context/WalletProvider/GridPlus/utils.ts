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
  expectedWalletUid?: string
}

export const connectAndPairDevice = async ({
  adapter,
  deviceId,
  sessionId,
  dispatch,
  expectedWalletUid,
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

    if (newSessionId) {
      dispatch(
        gridplusSlice.actions.setConnection({
          physicalDeviceId: deviceId,
          sessionId: newSessionId,
        }),
      )
    }
  }

  const wallet = await adapter.pairDevice(
    deviceId,
    undefined,
    undefined,
    sessionId ?? undefined,
    expectedWalletUid,
  )

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
}: PairConnectedDeviceParams): Promise<{
  wallet: GridPlusHDWallet
  walletUid: string
  isExternal: boolean
}> => {
  const { wallet, walletUid, isExternal } = await adapter.pairConnectedDevice(deviceId, pairingCode)

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

  return { wallet, walletUid, isExternal }
}

type FinalizeWalletSetupParams = {
  wallet: GridPlusHDWallet
  safeCardWalletId: string
  walletDispatch: Dispatch<ActionTypes>
  localWallet: LocalWallet
  navigate: NavigateFunction
  appDispatch: AppDispatch
  walletUid?: string
  isExternal?: boolean
}

export const finalizeWalletSetup = async ({
  wallet,
  safeCardWalletId,
  walletDispatch,
  localWallet,
  navigate,
  appDispatch,
  walletUid,
  isExternal,
}: FinalizeWalletSetupParams): Promise<void> => {
  const safeCardUuid = safeCardWalletId.replace('gridplus:', '')

  // If walletUid is missing, fetch it from the wallet
  let finalWalletUid = walletUid
  let finalIsExternal = isExternal

  if (finalWalletUid === undefined || finalIsExternal === undefined) {
    try {
      const validation = await wallet.validateActiveWallet()
      finalWalletUid = validation.uid
      finalIsExternal = validation.isExternal
      console.log('[finalizeWalletSetup] Fetched missing wallet UID:', finalWalletUid)
    } catch (error) {
      console.error('[finalizeWalletSetup] Failed to fetch wallet UID:', error)
    }
  }

  // Set expected wallet UID for JIT validation before signing
  if (finalWalletUid && wallet.setExpectedWalletUid) {
    wallet.setExpectedWalletUid(finalWalletUid)
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

  // Always update the SafeCard's walletUid if we have it
  if (finalWalletUid !== undefined && finalIsExternal !== undefined) {
    appDispatch(
      gridplusSlice.actions.updateSafeCardWalletUid({
        id: safeCardUuid,
        walletUid: finalWalletUid,
        isExternal: finalIsExternal,
      }),
    )
  }

  walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  navigate('/')
}
