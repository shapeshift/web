import 'dotenv/config'

import { avalancheAssetId, ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'

import { Asset, AssetsById } from '../service/AssetService'
import * as avalanche from './avalanche'
import { atom, bitcoin, bitcoincash, dogecoin, litecoin, thorchain } from './baseAssets'
import * as bnbsmartchain from './bnbsmartchain'
import * as ethereum from './ethereum'
import * as optimism from './optimism'
import * as osmosis from './osmosis'
import { overrideAssets } from './overrides'
import { filterOutBlacklistedAssets } from './utils'

const generateAssetData = async () => {
  const ethAssets = await ethereum.getAssets()
  const osmosisAssets = await osmosis.getAssets()
  const avalancheAssets = await avalanche.getAssets()
  const optimismAssets = await optimism.getAssets()
  const bnbsmartchainAssets = await bnbsmartchain.getAssets()

  // all assets, included assets to be blacklisted
  const unfilteredAssetData: Asset[] = [
    bitcoin,
    bitcoincash,
    dogecoin,
    litecoin,
    atom,
    thorchain,
    ...ethAssets,
    ...osmosisAssets,
    ...avalancheAssets,
    ...optimismAssets,
    ...bnbsmartchainAssets,
  ]

  // remove blacklisted assets
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredAssetData, 'assetId')

  const evmAssetNamesByChainId = {
    [KnownChainIds.EthereumMainnet]: ethAssets.map((asset) => asset.name),
    [KnownChainIds.AvalancheMainnet]: avalancheAssets.map((asset) => asset.name),
    [KnownChainIds.OptimismMainnet]: optimismAssets.map((asset) => asset.name),
    [KnownChainIds.BnbSmartChainMainnet]: bnbsmartchainAssets.map((asset) => asset.name),
  }

  const isNotUniqueAsset = (asset: Asset) => {
    const { chainId } = fromAssetId(asset.assetId)
    return Object.entries(evmAssetNamesByChainId)
      .reduce<string[]>((prev, [_chainId, assetNames]) => {
        if (chainId === _chainId) return prev
        return prev.concat(assetNames)
      }, [])
      .includes(asset.name)
  }

  const generatedAssetData = orderedAssetList.reduce<AssetsById>((acc, asset) => {
    const { chainId } = fromAssetId(asset.assetId)

    // mark any ethereum assets that also exist on other evm chains
    if (
      chainId === KnownChainIds.EthereumMainnet &&
      asset.assetId !== ethAssetId && // don't mark native asset
      isNotUniqueAsset(asset)
    ) {
      asset.name = `${asset.name} on Ethereum`
    }

    // mark any avalanche assets that also exist on other evm chains
    if (
      chainId === KnownChainIds.AvalancheMainnet &&
      asset.assetId !== avalancheAssetId && // don't mark native asset
      isNotUniqueAsset(asset)
    ) {
      asset.name = `${asset.name} on Avalanche`
    }

    // mark any bnbsmartchain assets that also exist on other evm chains
    if (chainId === KnownChainIds.BnbSmartChainMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on BNB Smart Chain`
    }

    // mark any optimism assets that also exist on other evm chains
    if (chainId === KnownChainIds.OptimismMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on Optimism`
    }

    acc[asset.assetId] = asset
    return acc
  }, {})

  // do this last such that manual overrides take priority
  const assetsWithOverridesApplied = Object.entries(overrideAssets).reduce<AssetsById>(
    (prev, [assetId, asset]) => {
      if (prev[assetId]) prev[assetId] = merge(prev[assetId], asset)
      return prev
    },
    generatedAssetData,
  )

  await fs.promises.writeFile(
    `./src/service/generatedAssetData.json`,
    // beautify the file for github diff.
    JSON.stringify(assetsWithOverridesApplied, null, 2),
  )
}

generateAssetData()
  .then(() => {
    console.info('done')
  })
  .catch((err) => console.info(err))
