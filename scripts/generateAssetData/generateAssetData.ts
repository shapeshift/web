import 'dotenv/config'

import {
  avalancheAssetId,
  ethAssetId,
  foxOnArbitrumOneAssetId,
  fromAssetId,
  gnosisAssetId,
  polygonAssetId,
} from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { decodeAssetData, encodeAssetData, unfreeze } from '@shapeshiftoss/utils'
import {
  atom,
  bitcoin,
  bitcoincash,
  dogecoin,
  litecoin,
  thorchain,
} from '@shapeshiftoss/utils/src/assetData/baseAssets'
import fs from 'fs'
import merge from 'lodash/merge'
import orderBy from 'lodash/orderBy'

import * as arbitrum from './arbitrum'
import * as arbitrumNova from './arbitrumNova'
import * as avalanche from './avalanche'
import * as base from './base'
import * as bnbsmartchain from './bnbsmartchain'
import { ASSET_DATA_PATH } from './constants'
import * as cosmos from './cosmos'
import * as ethereum from './ethereum'
import { generateRelatedAssetIndex } from './generateRelatedAssetIndex/generateRelatedAssetIndex'
import * as gnosis from './gnosis'
import * as optimism from './optimism'
import { overrideAssets } from './overrides'
import * as polygon from './polygon'
import * as solana from './solana'
import { filterOutBlacklistedAssets, getSortedAssetIds } from './utils'

const generateAssetData = async () => {
  const ethAssets = await ethereum.getAssets()
  const cosmosAssets = await cosmos.getAssets()
  const avalancheAssets = await avalanche.getAssets()
  const optimismAssets = await optimism.getAssets()
  const bnbsmartchainAssets = await bnbsmartchain.getAssets()
  const polygonAssets = await polygon.getAssets()
  const gnosisAssets = await gnosis.getAssets()
  const arbitrumAssets = await arbitrum.getAssets()
  const arbitrumNovaAssets = await arbitrumNova.getAssets()
  const baseAssets = await base.getAssets()
  const solanaAssets = await solana.getAssets()

  // all assets, included assets to be blacklisted
  const unfilteredAssetData: Asset[] = [
    unfreeze(bitcoin),
    unfreeze(bitcoincash),
    unfreeze(dogecoin),
    unfreeze(litecoin),
    unfreeze(atom),
    unfreeze(thorchain),
    ...ethAssets,
    ...cosmosAssets,
    ...avalancheAssets,
    ...optimismAssets,
    ...bnbsmartchainAssets,
    ...polygonAssets,
    ...gnosisAssets,
    ...arbitrumAssets,
    ...arbitrumNovaAssets,
    ...baseAssets,
    ...solanaAssets,
  ]

  // remove blacklisted assets
  const filteredAssetData = filterOutBlacklistedAssets(unfilteredAssetData)

  // deterministic order so diffs are readable
  const orderedAssetList = orderBy(filteredAssetData, 'assetId')

  const evmAssetNamesByChainId = {
    [KnownChainIds.EthereumMainnet]: ethAssets.map(asset => asset.name),
    [KnownChainIds.AvalancheMainnet]: avalancheAssets.map(asset => asset.name),
    [KnownChainIds.OptimismMainnet]: optimismAssets.map(asset => asset.name),
    [KnownChainIds.BnbSmartChainMainnet]: bnbsmartchainAssets.map(asset => asset.name),
    [KnownChainIds.PolygonMainnet]: polygonAssets.map(asset => asset.name),
    [KnownChainIds.GnosisMainnet]: gnosisAssets.map(asset => asset.name),
    [KnownChainIds.ArbitrumMainnet]: arbitrumAssets.map(asset => asset.name),
    [KnownChainIds.ArbitrumNovaMainnet]: arbitrumNovaAssets.map(asset => asset.name),
    [KnownChainIds.BaseMainnet]: baseAssets.map(asset => asset.name),
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

  const encodedAssetData = JSON.parse(await fs.promises.readFile(ASSET_DATA_PATH, 'utf8'))
  const { assetData: currentGeneratedAssetData } = decodeAssetData(encodedAssetData)

  const generatedAssetData = orderedAssetList.reduce<AssetsById>((acc, asset) => {
    const currentGeneratedAssetId = currentGeneratedAssetData[asset.assetId]
    // Ensures we don't overwrite existing relatedAssetIndex with the generated one, triggering a refetch
    if (currentGeneratedAssetId?.relatedAssetKey !== undefined) {
      asset.relatedAssetKey = currentGeneratedAssetId.relatedAssetKey
    }

    const { chainId } = fromAssetId(asset.assetId)

    // mark any ethereum assets that also exist on other chains (EVM chains and Solana)
    if (
      chainId === KnownChainIds.EthereumMainnet &&
      asset.assetId !== ethAssetId && // don't mark native asset
      isNotUniqueAsset(asset)
    ) {
      asset.name = `${asset.name} on Ethereum`
    }

    // mark any avalanche assets that also exist on other chains (EVM chains and Solana)
    if (
      chainId === KnownChainIds.AvalancheMainnet &&
      asset.assetId !== avalancheAssetId && // don't mark native asset
      isNotUniqueAsset(asset)
    ) {
      asset.name = `${asset.name} on Avalanche`
    }

    // mark any bnbsmartchain assets that also exist on other chains (EVM chains and Solana)
    if (chainId === KnownChainIds.BnbSmartChainMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on BNB Smart Chain`
    }

    // mark any polygon assets that also exist on other chains (EVM chains and Solana)
    if (
      chainId === KnownChainIds.PolygonMainnet &&
      asset.assetId !== polygonAssetId &&
      isNotUniqueAsset(asset)
    ) {
      asset.name = `${asset.name} on Polygon`
    }

    // mark any gnosis assets that also exist on other chains (EVM chains and Solana)
    if (
      chainId === KnownChainIds.GnosisMainnet &&
      asset.assetId !== gnosisAssetId &&
      isNotUniqueAsset(asset)
    ) {
      asset.name = `${asset.name} on Gnosis`
    }

    // mark any arbitrum one assets that also exist on other chains (EVM chains and Solana)
    if (chainId === KnownChainIds.ArbitrumMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on Arbitrum One`
    }

    // mark any arbitrum nova assets that also exist on other chains (EVM chains and Solana)
    if (chainId === KnownChainIds.ArbitrumNovaMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on Arbitrum Nova`
    }

    // mark any optimism assets that also exist on other chains (EVM chains and Solana)
    if (chainId === KnownChainIds.OptimismMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on Optimism`
    }

    // mark any base assets that also exist on other chains (EVM chains and Solana)
    if (chainId === KnownChainIds.BaseMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on Base`
    }

    // mark any base assets that also exist on EVM chains
    if (chainId === KnownChainIds.SolanaMainnet && isNotUniqueAsset(asset)) {
      asset.name = `${asset.name} on Solana`
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

  // Temporary workaround to circumvent the fact that no lists have that asset currently
  const foxOnArbitrumOne = {
    assetId: 'eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73',
    chainId: 'eip155:42161',
    name: 'FOX on Arbitrum One',
    precision: 18,
    color: '#3761F9',
    icon: '/fox-token-logo.png',
    symbol: 'FOX',
    explorer: 'https://arbiscan.io',
    explorerAddressLink: 'https://arbiscan.io/address/',
    explorerTxLink: 'https://arbiscan.io/tx/',
    relatedAssetKey: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
  }
  assetsWithOverridesApplied[foxOnArbitrumOneAssetId] = foxOnArbitrumOne

  const sortedAssetIds = await getSortedAssetIds(assetsWithOverridesApplied)

  // Encode the assets for minimal size while preserving ordering
  const reEncodedAssetData = encodeAssetData(sortedAssetIds, assetsWithOverridesApplied)
  await fs.promises.writeFile(ASSET_DATA_PATH, JSON.stringify(reEncodedAssetData))
}

const main = async () => {
  try {
    await generateAssetData()
    await generateRelatedAssetIndex()

    console.info('Assets and related assets data generated.')

    process.exit(0)
  } catch (err) {
    console.info(err)
    process.exit(1)
  }
}

main()
