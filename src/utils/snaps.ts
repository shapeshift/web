import type { ExternalProvider } from '@ethersproject/providers'
import detectEthereumProvider from '@metamask/detect-provider'
import assert from 'assert'
import { getConfig } from 'config'
// Snaps utils re-imported from http://github.com/shapeshift/metamask-snaps-adapter until it's actually ready
// We should eventually interface with hdwallet and can remove all this fluff

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

type Provider = Omit<ExternalProvider, 'request'> & {
  request?: (request: { method: string; params?: any }) => Promise<any>
}

export const shapeShiftSnapInstalled = async (snapId: string): Promise<boolean> => {
  const provider = (await detectEthereumProvider()) as Provider
  try {
    if (provider === undefined) {
      throw new Error('Could not get MetaMask provider')
    }
    if (provider.request === undefined) {
      throw new Error('MetaMask provider does not define a .request() method')
    }
    const ret = await provider.request({
      method: 'wallet_getSnaps',
    })

    /* Requested snap not found in registry */
    if (!ret[snapId]) {
      return false
    }

    /* Errors occurred during the previous snap installation */
    if (ret[snapId].error) {
      return false
    }
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const walletRequestSnaps = async (snapId: string, version?: string): Promise<any> => {
  const provider = (await detectEthereumProvider()) as Provider
  if (provider === undefined) {
    throw new Error('Could not get MetaMask provider')
  }
  if (provider.request === undefined) {
    throw new Error('MetaMask provider does not define a .request() method')
  }

  try {
    const ret = await provider.request({
      method: 'wallet_requestSnaps',
      params: {
        [snapId]: { version },
      },
    })
    return ret
  } catch (error) {
    console.error(error, `wallet_requestSnaps RPC call failed.`)
    return Promise.reject(error)
  }
}

export const enableShapeShiftSnap = async (
  version?: string,
): Promise<EnableShapeShiftSnapResult> => {
  const ret: EnableShapeShiftSnapResult = {
    success: false,
    message: {
      accounts: [],
      permissions: [],
      snaps: null,
      errors: undefined,
    },
  }
  try {
    const isSnapsEnabled = getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS
    const snapId = getConfig().REACT_APP_SNAP_ID
    assert(isSnapsEnabled, 'Please install MetaMask Flask.')
    const snapIsInstalled = await shapeShiftSnapInstalled(snapId)
    if (!snapIsInstalled) {
      const res = await walletRequestSnaps(snapId, version)
      assert(res.errors?.length === 0, JSON.stringify(res.errors, null, 2))
      ret.success = true
      ret.message = res
    }
  } catch (error) {
    console.error(error, 'walletRequestSnaps RPC call failed.')
  }
  return ret
}
