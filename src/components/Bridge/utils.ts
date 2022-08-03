import { EvmChain, GasToken } from '@axelar-network/axelarjs-sdk'
import {
  AssetId,
  avalancheChainId,
  ChainId,
  ethChainId,
  fromAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AXELAR_CHAIN_NAMES, AxelarChainName } from 'components/Bridge/types'

export const wrapAxelarAssetIdFromEthereumToAvalanche = (assetId: AssetId): AssetId | undefined => {
  const chainId = KnownChainIds.AvalancheMainnet
  const assetNamespace = 'erc20'
  switch (assetId) {
    // USDC on Ethereum
    case 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48':
      // axlUSDC on Avalanche
      return toAssetId({
        chainId,
        assetNamespace,
        assetReference: '0xfab550568c688d5d8a52c7d794cb93edc26ec0ec',
      })
    default:
      return undefined
  }
}

export const unwrapAxelarAssetIdFromAvalancheToEthereum = (
  assetId: AssetId,
): AssetId | undefined => {
  const chainId = KnownChainIds.EthereumMainnet
  const assetNamespace = 'erc20'
  switch (assetId) {
    // axlUSDC on Avalanche
    case 'eip155:43114/erc20:0xfab550568c688d5d8a52c7d794cb93edc26ec0ec':
      // USDC on Ethereum
      return toAssetId({
        chainId,
        assetNamespace,
        assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      })
    default:
      return undefined
  }
}

export const getBridgeDestinationAsset = (assetId: AssetId): AssetId | undefined => {
  const { chainId } = fromAssetId(assetId)
  switch (chainId) {
    case ethChainId:
      return wrapAxelarAssetIdFromEthereumToAvalanche(assetId)
    case avalancheChainId:
      return unwrapAxelarAssetIdFromAvalancheToEthereum(assetId)
    default:
      return undefined
  }
}

export const chainNameToAxelarEvmChain = (name: string): EvmChain => {
  switch (name) {
    case AXELAR_CHAIN_NAMES.Ethereum:
      return EvmChain.ETHEREUM
    case AXELAR_CHAIN_NAMES.Avalanche:
      return EvmChain.AVALANCHE
    default:
      throw new Error(`chainNameToAxelarEvmChain: name ${name} not supported`)
  }
}

export const chainNameToAxelarGasToken = (name: string): GasToken => {
  switch (name) {
    case AXELAR_CHAIN_NAMES.Ethereum:
      return GasToken.ETH
    case AXELAR_CHAIN_NAMES.Avalanche:
      return GasToken.AVAX
    default:
      throw new Error(`chainNameToAxelarGasToken: name ${name} not supported`)
  }
}

export const chainIdToChainName = (chainId: ChainId): AxelarChainName => {
  switch (chainId) {
    case ethChainId:
      return AXELAR_CHAIN_NAMES.Ethereum
    case avalancheChainId:
      return AXELAR_CHAIN_NAMES.Avalanche
    default:
      throw new Error(`chainIdToChainName: chainId ${chainId} not supported`)
  }
}

// TODO: use import { loadAssets } from '@axelar-network/axelarjs-sdk'
export const getAxelarAsset = (symbol: string, chainId: ChainId): string => {
  switch (chainId) {
    case ethChainId:
      switch (symbol) {
        case 'USDC':
          return symbol
        default:
          throw new Error(`getAxelarAsset: symbol ${symbol} on chainId ${chainId} not supported`)
      }
    case avalancheChainId:
      switch (symbol) {
        case 'AXLUSDC':
          return 'axlUSDC'
        default:
          throw new Error(`getAxelarAsset: symbol ${symbol} on chainId ${chainId} not supported`)
      }
    default:
      throw new Error(`getAxelarAsset: symbol ${symbol} on chainId ${chainId} not supported`)
  }
}
