import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { filterAssetsForWallet } from './filterAssetsForWallet'

describe('filterAssetsForWallet', () => {
  const supportedAsset = {
    assetId: ethAssetId,
    chainId: KnownChainIds.EthereumMainnet,
  } as Asset

  const unsupportedAsset = {
    assetId: btcAssetId,
    chainId: KnownChainIds.BitcoinMainnet,
  } as Asset

  const assets = [supportedAsset, unsupportedAsset]

  it('excludes unsupported chains when wallet is connected and allowWalletUnsupportedAssets is false', () => {
    const result = filterAssetsForWallet({
      assets,
      hasWallet: true,
      allowWalletUnsupportedAssets: false,
      walletConnectedChainIds: [KnownChainIds.EthereumMainnet],
    })

    expect(result).toEqual([supportedAsset])
  })

  it('retains unsupported chains when wallet is connected and allowWalletUnsupportedAssets is true', () => {
    const result = filterAssetsForWallet({
      assets,
      hasWallet: true,
      allowWalletUnsupportedAssets: true,
      walletConnectedChainIds: [KnownChainIds.EthereumMainnet],
    })

    expect(result).toEqual([supportedAsset, unsupportedAsset])
  })

  it('does not filter by walletConnectedChainIds when no wallet is connected', () => {
    const result = filterAssetsForWallet({
      assets,
      hasWallet: false,
      allowWalletUnsupportedAssets: false,
      walletConnectedChainIds: [KnownChainIds.EthereumMainnet],
    })

    expect(result).toEqual([supportedAsset, unsupportedAsset])
  })

  it('applies assetFilterPredicate if provided', () => {
    const result = filterAssetsForWallet({
      assets,
      hasWallet: false,
      allowWalletUnsupportedAssets: true,
      walletConnectedChainIds: [],
      assetFilterPredicate: assetId => assetId === ethAssetId,
    })

    expect(result).toEqual([supportedAsset])
  })
})
