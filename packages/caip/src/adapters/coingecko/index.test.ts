import { toAssetId } from '../../assetId/assetId'
import {
  ASSET_REFERENCE,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  ethChainId,
} from '../../constants'
import {
  assetIdToCoingecko,
  chainIdToCoingeckoAssetPlatform,
  CoingeckoAssetPlatform,
  coingeckoToAssetIds,
} from '.'

describe('adapters:coingecko', () => {
  describe('coingeckoToAssetIds', () => {
    it('can get AssetIds for bitcoin', () => {
      const chainNamespace = CHAIN_NAMESPACE.Utxo
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet

      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin,
      })
      expect(coingeckoToAssetIds('bitcoin')).toEqual([assetId])
    })

    it('can get AssetIds id for ethereum', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const eth = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum,
      })
      const ethOptimism = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.OptimismMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Optimism,
      })
      expect(coingeckoToAssetIds('ethereum')).toEqual([eth, ethOptimism])
    })

    it('can get AssetIds id for FOX', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(coingeckoToAssetIds('shapeshift-fox-token')).toEqual([assetId])
    })

    it('can get AssetIds for cosmos', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Cosmos,
      })
      expect(coingeckoToAssetIds('cosmos')).toEqual([assetId])
    })

    it('can get AssetIds for osmosis', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Osmosis,
      })
      expect(coingeckoToAssetIds('osmosis')).toEqual([assetId])
    })

    it('can get AssetIds for USD Coin on EVM Chains', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const assetNamespace = 'erc20'
      const usdcEth = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace,
        assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      })
      const usdcAvalanche = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.AvalancheCChain,
        assetNamespace,
        assetReference: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
      })
      const usdcOptimism = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.OptimismMainnet,
        assetNamespace,
        assetReference: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      })
      expect(coingeckoToAssetIds('usd-coin')).toEqual([usdcEth, usdcAvalanche, usdcOptimism])
    })
  })

  describe('assetIdToCoingecko', () => {
    it('can get CoinGecko id for bitcoin AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Utxo
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin,
      })
      expect(assetIdToCoingecko(assetId)).toEqual('bitcoin')
    })

    it('can get CoinGecko id for ethereum AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum,
      })
      expect(assetIdToCoingecko(assetId)).toEqual('ethereum')
    })

    it('can get CoinGecko id for FOX', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(assetIdToCoingecko(assetId)).toEqual('shapeshift-fox-token')
    })

    it('can get CoinGecko id for cosmos AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Cosmos,
      })
      expect(assetIdToCoingecko(assetId)).toEqual('cosmos')
    })

    it('can get CoinGecko id for osmosis AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Osmosis,
      })
      expect(assetIdToCoingecko(assetId)).toEqual('osmosis')
    })
  })

  describe('chainIdToCoingeckoAssetPlatform', () => {
    it('can get CoinGecko asset platform from ChainId', () => {
      const chainId = ethChainId
      expect(chainIdToCoingeckoAssetPlatform(chainId)).toEqual(CoingeckoAssetPlatform.Ethereum)
    })

    it('throws on invalid ChainId', () => {
      const chainId = btcChainId
      expect(() => chainIdToCoingeckoAssetPlatform(chainId)).toThrow()
    })
  })
})
