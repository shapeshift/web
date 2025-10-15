import type { GridPlusAdapter, GridPlusHDWallet } from '@shapeshiftoss/hdwallet-gridplus'

import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import type { AppDispatch } from '@/state/store'

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
