import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE, fromChainId } from '@shapeshiftoss/caip'
import { BigNumber } from 'ethers'

export * from './bignumber'
export * from './bip44'
export * from './fees'
export * from './utxoUtils'

export const getAssetNamespace = (type: string): AssetNamespace => {
  if (type === 'ERC20') return 'erc20'
  if (type === 'ERC721') return 'erc721'
  if (type === 'ERC1155') return 'erc1155'
  if (type === 'BEP20') return 'bep20'
  if (type === 'BEP721') return 'bep721'
  if (type === 'BEP1155') return 'bep1155'
  throw new Error(`Unknown asset namespace. type: ${type}`)
}

export const chainIdToChainLabel = (chainId: ChainId): string => {
  const { chainNamespace, chainReference } = fromChainId(chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Utxo:
      switch (chainReference) {
        case CHAIN_REFERENCE.BitcoinMainnet:
          return 'bitcoin'
        case CHAIN_REFERENCE.BitcoinCashMainnet:
          return 'bitcoincash'
        case CHAIN_REFERENCE.DogecoinMainnet:
          return 'dogecoin'
        case CHAIN_REFERENCE.LitecoinMainnet:
          return 'litecoin'
        default:
          throw new Error(
            `chainReference: ${chainReference}, not supported for chainNamespace: ${chainNamespace}`,
          )
      }
    case CHAIN_NAMESPACE.Evm:
      switch (chainReference) {
        case CHAIN_REFERENCE.EthereumMainnet:
        case CHAIN_REFERENCE.EthereumRinkeby:
        case CHAIN_REFERENCE.EthereumRopsten:
        case CHAIN_REFERENCE.AvalancheCChain:
        case CHAIN_REFERENCE.OptimismMainnet:
        case CHAIN_REFERENCE.BnbSmartChainMainnet:
        case CHAIN_REFERENCE.PolygonMainnet:
        case CHAIN_REFERENCE.GnosisMainnet:
          return 'ethereum' // all evm chains use the same validator (https://github.com/christsim/multicoin-address-validator/blob/master/src/ethereum_validator.js)
        default:
          throw new Error(
            `chainReference: ${chainReference}, not supported for chainNamespace: ${chainNamespace}`,
          )
      }
    case CHAIN_NAMESPACE.CosmosSdk:
      switch (chainReference) {
        case CHAIN_REFERENCE.CosmosHubMainnet:
        case CHAIN_REFERENCE.CosmosHubVega:
          return 'cosmos'
        case CHAIN_REFERENCE.OsmosisMainnet:
        case CHAIN_REFERENCE.OsmosisTestnet:
          return 'osmosis'
        case CHAIN_REFERENCE.ThorchainMainnet:
          return 'thorchain'
        default:
          throw new Error(
            `chainReference: ${chainReference}, not supported for chainNamespace: ${chainNamespace}`,
          )
      }
    default:
      throw new Error(`chainNamespace ${chainNamespace} not supported.`)
  }
}

export const convertNumberToHex = (value: string): string => BigNumber.from(value).toHexString()
