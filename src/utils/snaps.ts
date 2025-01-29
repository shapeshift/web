import { getConfig } from 'config'
import type { Eip1193Provider } from 'ethers'
import { METAMASK_RDNS, mipdStore } from 'lib/mipd'

type GetSnapsResult = Record<
  string,
  {
    version: string
    id: string
    enabled: boolean
    blocked: boolean
  }
>

export const enableShapeShiftSnap = async (): Promise<void> => {
  const mipdProvider = mipdStore
    .getProviders()
    .find(provider => provider.info.rdns === METAMASK_RDNS)
  if (!mipdProvider) throw new Error("EIP-1193 provider isn't MetaMask")

  const provider = mipdProvider.provider as Eip1193Provider

  const snapVersion = getConfig().REACT_APP_SNAP_VERSION
  const snapId = getConfig().REACT_APP_SNAP_ID

  await provider.request({
    method: 'wallet_requestSnaps',
    params: {
      [snapId]: {
        version: snapVersion,
      },
    },
  })
}

export const getSnapVersion = async (): Promise<string | null> => {
  const snapId = getConfig().REACT_APP_SNAP_ID
  const mipdProvider = mipdStore
    .getProviders()
    .find(provider => provider.info.rdns === METAMASK_RDNS)
  if (!mipdProvider) return null

  const provider = mipdProvider.provider as Eip1193Provider

  const snaps: GetSnapsResult = await provider.request({
    method: 'wallet_getSnaps',
  })
  const snap = snaps[snapId]
  if (!snap) return null

  return snap.version
}
