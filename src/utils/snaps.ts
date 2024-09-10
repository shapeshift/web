import detectEthereumProvider from '@metamask/detect-provider'
import { enableShapeShiftSnap as _enableShapeShiftSnap } from '@shapeshiftoss/metamask-snaps-adapter'
import assert from 'assert'
import { getConfig } from 'config'
import type { Eip1193Provider } from 'ethers'

export interface WalletEnableResult {
  accounts: string[]
  permissions: any[]
  snaps: any
  errors?: Error[]
}

type GetSnapsResult = Record<
  string,
  {
    version: string
    id: string
    enabled: boolean
    blocked: boolean
  }
>

export const enableShapeShiftSnap = async (
  version: string = getConfig().REACT_APP_SNAP_ID,
): Promise<void> => {
  const isSnapFeatureEnabled = getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS
  assert(isSnapFeatureEnabled, 'Snap feature flag is disabled')
  const snapId = getConfig().REACT_APP_SNAP_ID
  await _enableShapeShiftSnap(snapId, version)
}

export const getSnapVersion = async (): Promise<string | null> => {
  const snapId = getConfig().REACT_APP_SNAP_ID
  const provider = (await detectEthereumProvider()) as Eip1193Provider
  if (!(provider as any).isMetaMask) return null

  const snaps: GetSnapsResult = await provider.request({
    method: 'wallet_getSnaps',
  })
  const snap = snaps[snapId]
  if (!snap) return null

  return snap.version
}
