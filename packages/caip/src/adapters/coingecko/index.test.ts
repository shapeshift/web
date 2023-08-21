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
      expect(coingeckoToAssetIds('ethereum')).toEqual([ethOnEthereum, ethOnOptimism])
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
        assetReference: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      })
      const usdcOnBsc = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.BnbSmartChainMainnet,
        assetNamespace: 'bep20',
        assetReference: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      })
      const usdcOnPolygon = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.PolygonMainnet,
        assetNamespace,
        assetReference: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      })
      const usdcOnGnosis = toAssetId({
        chainNamespace,
        chainReference: CHAIN_REFERENCE.GnosisMainnet,
        assetNamespace,
        assetReference: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
      })
      expect(coingeckoToAssetIds('usd-coin')).toEqual([
        usdcOnEthereum,
        usdcOnAvalanche,
        usdcOnOptimism,
        usdcOnBsc,
        usdcOnPolygon,
        usdcOnGnosis,
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
      console.log(assetId)
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
