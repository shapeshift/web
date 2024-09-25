import { describe, expect, it } from 'vitest'

import { toAssetId } from '../../assetId/assetId'
import {
  ASSET_REFERENCE,
  btcChainId,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  ethChainId,
  foxOnArbitrumOneAssetId,
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
      const ethOnEthereum = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum,
      })
      const ethOnOptimism = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.OptimismMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Optimism,
      })
      const ethOnArbitrum = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.ArbitrumMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Arbitrum,
      })
      const ethOnArbitrumNova = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.ArbitrumNovaMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.ArbitrumNova,
      })
      const ethOnBase = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.BaseMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Base,
      })
      expect(coingeckoToAssetIds('ethereum')).toEqual([
        ethOnEthereum,
        ethOnOptimism,
        ethOnArbitrum,
        ethOnArbitrumNova,
        ethOnBase,
      ])
    })

    it('can get AssetIds id for FOX', () => {
      const assetNamespace = 'erc20'
      const foxOnEthereum = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace,
        assetReference: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      })
      const foxOnPolygon = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.PolygonMainnet,
        assetNamespace,
        assetReference: '0x65a05db8322701724c197af82c9cae41195b0aa8',
      })
      const foxOnGnosis = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.GnosisMainnet,
        assetNamespace,
        assetReference: '0x21a42669643f45bc0e086b8fc2ed70c23d67509d',
      })
      const foxOnOptimism = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.OptimismMainnet,
        assetNamespace,
        assetReference: '0xf1a0da3367bc7aa04f8d94ba57b862ff37ced174',
      })

      expect(coingeckoToAssetIds('shapeshift-fox-token')).toEqual([
        foxOnEthereum,
        foxOnOptimism,
        foxOnPolygon,
        foxOnGnosis,
        foxOnArbitrumOneAssetId,
      ])
    })

    it('can get AssetIds for cosmos', () => {
      const atomOnCosmos = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.CosmosSdk,
        chainReference: CHAIN_REFERENCE.CosmosHubMainnet,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Cosmos,
      })
      const atomOnBsc = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.BnbSmartChainMainnet,
        assetNamespace: 'bep20',
        assetReference: '0x0eb3a705fc54725037cc9e008bdede697f62f335',
      })
      expect(coingeckoToAssetIds('cosmos')).toEqual([atomOnCosmos, atomOnBsc])
    })

    it('can get AssetIds for USD Coin on Solana and EVM chains using coingecko', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const assetNamespace = 'erc20'
      const usdcOnEthereum = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace,
        assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      })
      const usdcOnAvalanche = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.AvalancheCChain,
        assetNamespace,
        assetReference: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
      })
      const usdcOnOptimism = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.OptimismMainnet,
        assetNamespace,
        assetReference: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      })
      const usdcOnPolygon = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.PolygonMainnet,
        assetNamespace,
        assetReference: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
      })
      const usdcOnArbitrum = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.ArbitrumMainnet,
        assetNamespace,
        assetReference: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      })
      const usdcOnBase = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.BaseMainnet,
        assetNamespace,
        assetReference: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      })
      const usdcOnSolana = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Solana,
        chainReference: CHAIN_REFERENCE.SolanaMainnet,
        assetNamespace: 'spl',
        assetReference: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      })
      expect(coingeckoToAssetIds('usd-coin')).toEqual([
        usdcOnEthereum,
        usdcOnAvalanche,
        usdcOnOptimism,
        usdcOnPolygon,
        usdcOnArbitrum,
        usdcOnBase,
        usdcOnSolana,
      ])
    })
    it('can get AssetIds for bridged USD Coin on EVM Chains', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const assetNamespace = 'erc20'
      const usdcOnBscBridged = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.BnbSmartChainMainnet,
        assetNamespace: 'bep20',
        assetReference: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      })
      const usdcOnPolygonBridged = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.PolygonMainnet,
        assetNamespace,
        assetReference: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      })
      const usdcOnArbitrumNovaBridged = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.ArbitrumNovaMainnet,
        assetNamespace,
        assetReference: '0x750ba8b76187092B0D1E87E28daaf484d1b5273b',
      })
      const usdcOnGnosisBridged = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.GnosisMainnet,
        assetNamespace,
        assetReference: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
      })
      expect(coingeckoToAssetIds('binance-bridged-usdc-bnb-smart-chain')).toEqual([
        usdcOnBscBridged,
      ])
      expect(coingeckoToAssetIds('bridged-usdc-polygon-pos-bridge')).toEqual([usdcOnPolygonBridged])
      expect(coingeckoToAssetIds('gnosis-xdai-bridged-usdc-gnosis')).toEqual([usdcOnGnosisBridged])
      expect(coingeckoToAssetIds('official-arbitrum-bridged-usdc-arbitrum-nova')).toEqual([
        usdcOnArbitrumNovaBridged,
      ])
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

    it('can get CoinGecko id for polygon AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.PolygonMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Polygon,
      })
      expect(assetIdToCoingecko(assetId)).toEqual('matic-network')
    })
    it('can get CoinGecko id for gnosis AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.GnosisMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Gnosis,
      })
      expect(assetIdToCoingecko(assetId)).toEqual('xdai')
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
