import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  baseChainId,
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
  starknetAssetId,
  starknetChainId,
} from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import type { GetTradeAssetListsArgs } from './getTradeAssetLists'
import { getTradeAssetLists } from './getTradeAssetLists'

const makeTestAsset = (
  assetId: AssetId,
  chainId: ChainId,
  symbol: string,
  relatedAssetKey?: AssetId,
): Asset => ({ assetId, chainId, symbol, name: symbol, relatedAssetKey }) as Asset

const BTC = makeTestAsset(btcAssetId, btcChainId, 'BTC')
const ETH = makeTestAsset(ethAssetId, ethChainId, 'ETH')
const STRK = makeTestAsset(starknetAssetId, starknetChainId, 'STRK')

const USDC_ETH_ID = 'eip155:1/erc20:0xusdc'
const USDC_ETH = makeTestAsset(USDC_ETH_ID, ethChainId, 'USDC', USDC_ETH_ID)
const USDC_SN = makeTestAsset('starknet:SN_MAIN/token:0xusdc', starknetChainId, 'USDC', USDC_ETH_ID)
const USDC_E_SN = makeTestAsset(
  'starknet:SN_MAIN/token:0xusdce',
  starknetChainId,
  'USDC.E',
  USDC_ETH_ID,
)
const USDC_SPAM_SN = makeTestAsset(
  'starknet:SN_MAIN/token:0xusdcspam',
  starknetChainId,
  'USDC',
  USDC_ETH_ID,
)
const AXLUSDC_ARB = makeTestAsset(
  'eip155:42161/erc20:0xaxlusdc',
  arbitrumChainId,
  'AXLUSDC',
  USDC_ETH_ID,
)

const USDT_ETH_ID = 'eip155:1/erc20:0xusdt'
const USDT_ETH = makeTestAsset(USDT_ETH_ID, ethChainId, 'USDT', USDT_ETH_ID)
const USDT_SN = makeTestAsset('starknet:SN_MAIN/token:0xusdt', starknetChainId, 'USDT', USDT_ETH_ID)
const USDT_SPAM_SN = makeTestAsset(
  'starknet:SN_MAIN/token:0xusdtspam',
  starknetChainId,
  'USDT',
  USDT_ETH_ID,
)

const DAI_ETH_ID = 'eip155:1/erc20:0xdai'
const DAI_ETH = makeTestAsset(DAI_ETH_ID, ethChainId, 'DAI', DAI_ETH_ID)
const DAI_SN = makeTestAsset('starknet:SN_MAIN/token:0xdai', starknetChainId, 'DAI', DAI_ETH_ID)
const DAI_V0_SN = makeTestAsset(
  'starknet:SN_MAIN/token:0xdaiv0',
  starknetChainId,
  'DAI_V0',
  DAI_ETH_ID,
)

const TRUMP_BASE_ID = 'eip155:8453/erc20:0xtrump'
const TRUMP_BASE = makeTestAsset(TRUMP_BASE_ID, baseChainId, 'TRUMP', TRUMP_BASE_ID)
const TRUMP_ETH_1 = makeTestAsset('eip155:1/erc20:0xtrump1', ethChainId, 'TRUMP', TRUMP_BASE_ID)
const TRUMP_ETH_2 = makeTestAsset('eip155:1/erc20:0xtrump2', ethChainId, 'TRUMP', TRUMP_BASE_ID)

const allAssets = [
  BTC,
  ETH,
  STRK,
  USDC_ETH,
  USDC_SN,
  USDC_E_SN,
  USDC_SPAM_SN,
  AXLUSDC_ARB,
  USDT_ETH,
  USDT_SN,
  USDT_SPAM_SN,
  DAI_ETH,
  DAI_SN,
  DAI_V0_SN,
  TRUMP_BASE,
  TRUMP_ETH_1,
  TRUMP_ETH_2,
]

// Index order puts spam first, so the lists have to leave it out
const relatedAssetIndex = {
  [USDC_ETH_ID]: [USDC_SPAM_SN.assetId, USDC_E_SN.assetId, USDC_SN.assetId, AXLUSDC_ARB.assetId],
  [USDT_ETH_ID]: [USDT_SPAM_SN.assetId, USDT_SN.assetId],
  [DAI_ETH_ID]: [DAI_V0_SN.assetId, DAI_SN.assetId],
  [TRUMP_BASE_ID]: [TRUMP_ETH_1.assetId, TRUMP_ETH_2.assetId],
}

const popularAll = [BTC, ETH, USDT_ETH, USDC_ETH, DAI_ETH, STRK]
const popularStarknet = [USDT_SN, USDC_SN, USDC_E_SN, DAI_SN, DAI_V0_SN, STRK]

const baseArgs: GetTradeAssetListsArgs = {
  activeChainId: 'All',
  popularAssets: popularAll,
  portfolioAssets: [],
  hasPortfolio: false,
  hasWallet: true,
  allowWalletUnsupportedAssets: false,
  walletConnectedChainIds: [starknetChainId],
  assetsById: Object.fromEntries(allAssets.map(asset => [asset.assetId, asset])),
  relatedAssetIndex,
  spamMarkedAssetIds: [USDC_SPAM_SN.assetId, USDT_SPAM_SN.assetId],
}

const ids = (assets: Asset[]) => assets.map(asset => asset.assetId)

describe('getTradeAssetLists', () => {
  describe('sell, all networks, wallet limited to Starknet', () => {
    const lists = getTradeAssetLists(baseArgs)

    it('swaps assets for their Starknet version, grouping several and dropping those with none', () => {
      // USDT has one non-spam Starknet version, USDC and DAI have two, BTC and ETH have none
      expect(ids(lists.popularRows)).toEqual([
        USDT_SN.assetId,
        USDC_ETH.assetId,
        DAI_ETH.assetId,
        STRK.assetId,
      ])
    })

    it('picks one supported, non-spam version of each asset for the chips', () => {
      expect(ids(lists.quickAccessAssets)).toEqual([
        USDT_SN.assetId,
        USDC_E_SN.assetId,
        DAI_V0_SN.assetId,
        STRK.assetId,
      ])
    })
  })

  describe('sell, single network', () => {
    const lists = getTradeAssetLists({
      ...baseArgs,
      activeChainId: starknetChainId,
      popularAssets: popularStarknet,
    })

    it('lists every popular asset on the network', () => {
      expect(ids(lists.popularRows)).toEqual(ids(popularStarknet))
    })

    it('uses the first popular assets on the network for the chips', () => {
      expect(ids(lists.quickAccessAssets)).toEqual(ids(popularStarknet))
    })
  })

  describe('buy, or no wallet connected', () => {
    it.each([
      ['buy', { allowWalletUnsupportedAssets: true }],
      ['no wallet', { hasWallet: false }],
    ])('lists every asset unchanged (%s)', (_, overrides) => {
      const lists = getTradeAssetLists({ ...baseArgs, ...overrides })

      expect(ids(lists.popularRows)).toEqual(ids(popularAll))
      expect(ids(lists.quickAccessAssets)).toEqual(ids(popularAll))
    })
  })

  describe('held balances', () => {
    it('keeps held assets in balance order and leaves them out of the popular rows', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        hasPortfolio: true,
        portfolioAssets: [DAI_ETH, STRK, USDT_ETH],
      })

      expect(ids(lists.portfolioRows)).toEqual([DAI_ETH.assetId, STRK.assetId, USDT_SN.assetId])
      expect(ids(lists.popularRows)).toEqual([USDC_ETH.assetId])
    })

    it('still lists the other versions of a held asset on a single network', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        activeChainId: starknetChainId,
        popularAssets: popularStarknet,
        hasPortfolio: true,
        portfolioAssets: [USDC_E_SN],
      })

      expect(ids(lists.popularRows)).toContain(USDC_SN.assetId)
      expect(ids(lists.popularRows)).not.toContain(USDC_E_SN.assetId)
    })
  })

  describe('filters', () => {
    it('still offers the supported version of an asset the filter rejects, e.g. the buy asset', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        assetFilterPredicate: assetId => assetId !== USDT_ETH.assetId,
      })

      expect(ids(lists.popularRows)).toContain(USDT_SN.assetId)
    })

    it('drops a version the filter rejects', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        assetFilterPredicate: assetId => assetId !== USDT_SN.assetId,
      })

      expect(ids(lists.popularRows)).not.toContain(USDT_SN.assetId)
      expect(ids(lists.quickAccessAssets)).not.toContain(USDT_SN.assetId)
    })

    it('swaps an asset on a connected chain the filter rejects for its allowed version, e.g. limit orders', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        walletConnectedChainIds: [ethChainId, starknetChainId],
        popularAssets: [USDT_ETH],
        chainIdFilterPredicate: chainId => chainId !== ethChainId,
      })

      expect(ids(lists.popularRows)).toEqual([USDT_SN.assetId])
    })

    it('applies the chain filter when the list is not limited to the wallet, e.g. fiat buy', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        allowWalletUnsupportedAssets: true,
        chainIdFilterPredicate: chainId => chainId !== starknetChainId,
      })

      expect(ids(lists.popularRows)).not.toContain(STRK.assetId)
      expect(ids(lists.quickAccessAssets)).not.toContain(STRK.assetId)
    })

    it('never swaps in a version from another network on a network tab', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        walletConnectedChainIds: [ethChainId, starknetChainId],
        activeChainId: starknetChainId,
        popularAssets: popularStarknet,
        assetFilterPredicate: assetId => assetId !== USDT_SN.assetId,
      })

      expect(lists.popularRows.every(asset => asset.chainId === starknetChainId)).toBe(true)
      expect(ids(lists.popularRows)).not.toContain(USDT_SN.assetId)
    })

    it('does not swap in a version on a chain the chain filter rejects', () => {
      const lists = getTradeAssetLists({
        ...baseArgs,
        popularAssets: [USDT_ETH],
        chainIdFilterPredicate: chainId => chainId !== starknetChainId,
      })

      expect(lists.popularRows).toEqual([])
    })
  })

  it('picks the first Ethereum version for a chip when the asset lives on a chain the wallet cannot use', () => {
    const lists = getTradeAssetLists({
      ...baseArgs,
      walletConnectedChainIds: [ethChainId],
      popularAssets: [TRUMP_BASE],
    })

    expect(ids(lists.quickAccessAssets)).toEqual([TRUMP_ETH_1.assetId])
  })
})
