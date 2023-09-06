import { enableShapeShiftSnap as _enableShapeShiftSnap } from '@shapeshiftoss/metamask-snaps-adapter'
import assert from 'assert'
import { getConfig } from 'config'

export interface WalletEnableResult {
  accounts: string[]
  permissions: any[]
  snaps: any
  errors?: Error[]
}
interface EnableShapeShiftSnapResult {
  success: boolean
  message: WalletEnableResult
}

export const enableShapeShiftSnap = (version?: string): Promise<EnableShapeShiftSnapResult> => {
  const isSnapFeatureEnabled = getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS
  assert(isSnapFeatureEnabled, 'Snap feature flag is disabled')
  const snapId = getConfig().REACT_APP_SNAP_ID
  return _enableShapeShiftSnap(snapId, version)
}
