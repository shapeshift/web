import { EvmChain, GasToken } from '@axelar-network/axelarjs-sdk'
import { AssetId, avalancheChainId, ChainId, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AXELAR_CHAIN_NAMES, AxelarChainName } from 'components/Bridge/types'

export const wrapAxelarAssetIdFromEthereumToAvalanche = (asset: AssetId): AssetId | undefined => {
  const chainId = KnownChainIds.AvalancheMainnet
  const assetNamespace = 'erc20'
  switch (asset) {
    // USDC on Ethereum
    case 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48':
      return toAssetId({
        chainId,
        assetNamespace,
        assetReference: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
      })
    default:
      return undefined
  }
}

export const unwrapAxelarAssetIdFromAvalancheToEthereum = (asset: AssetId): AssetId | undefined => {
  const chainId = KnownChainIds.EthereumMainnet
  const assetNamespace = 'erc20'
  switch (asset) {
    // Axelar-wrapped USDC on Avalanche
    case 'eip155:43114/erc20:0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664':
      return toAssetId({
        chainId,
        assetNamespace,
        assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      })
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
