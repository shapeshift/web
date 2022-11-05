import { EvmChain, GasToken } from '@axelar-network/axelarjs-sdk'
import type { AssetId, ChainId } from '@keepkey/caip'
import { avalancheChainId, ethChainId, fromAssetId, toAssetId } from '@keepkey/caip'
import { KnownChainIds } from '@keepkey/types'
import { getAxelarQuerySdk } from 'components/Bridge/axelarQuerySdkSingleton'
import type { AxelarChainName, BridgeAsset } from 'components/Bridge/types'
import { AxelarChainNames } from 'components/Bridge/types'

export const wrapAxelarAssetIdFromEthereumToAvalanche = (assetId: AssetId): AssetId | null => {
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
      return null
  }
}

export const unwrapAxelarAssetIdFromAvalancheToEthereum = (assetId: AssetId): AssetId | null => {
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
      return null
  }
}

export const getBridgeDestinationAsset = (assetId: AssetId): AssetId | null => {
  const { chainId } = fromAssetId(assetId)
  switch (chainId) {
    case ethChainId:
      return wrapAxelarAssetIdFromEthereumToAvalanche(assetId)
    case avalancheChainId:
      return unwrapAxelarAssetIdFromAvalancheToEthereum(assetId)
    default:
      return null
  }
}

export const chainNameToEvmChain = (name: AxelarChainName): EvmChain => {
  switch (name) {
    case AxelarChainNames.Ethereum:
      return EvmChain.ETHEREUM
    case AxelarChainNames.Avalanche:
      return EvmChain.AVALANCHE
    default:
      throw new Error(`chainNameToEvmChain: name ${name} not supported`)
  }
}

export const chainNameToGasToken = (name: AxelarChainName): GasToken => {
  switch (name) {
    case AxelarChainNames.Ethereum:
      return GasToken.ETH
    case AxelarChainNames.Avalanche:
      return GasToken.AVAX
    default:
      throw new Error(`chainNameToGasToken: name ${name} not supported`)
  }
}

export const chainIdToChainName = (chainId: ChainId): AxelarChainName => {
  switch (chainId) {
    case ethChainId:
      return AxelarChainNames.Ethereum
    case avalancheChainId:
      return AxelarChainNames.Avalanche
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

export const getDenomFromBridgeAsset = (asset: BridgeAsset | undefined): string | null => {
  const axelarQuerySdk = getAxelarQuerySdk()
  const chainId = fromAssetId(asset?.assetId ?? '').chainId
  const chainName = chainIdToChainName(chainId).toLowerCase() // the sdk uses lower case names for some reason
  const symbol = asset?.symbol ?? ''
  const axelarAsset = getAxelarAsset(symbol, chainId)
  return axelarQuerySdk.getDenomFromSymbol(axelarAsset, chainName)
}
