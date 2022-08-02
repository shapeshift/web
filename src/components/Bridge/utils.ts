import { EvmChain, GasToken } from '@axelar-network/axelarjs-sdk'
import { AssetId, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AXELAR_CHAIN_NAMES } from 'components/Bridge/types'

export const wrapAxelarAssetIdFromEthereumToAvalanche = (asset: AssetId): AssetId | undefined => {
  const chainId = KnownChainIds.AvalancheMainnet
  const assetNamespace = 'erc20'
  switch (asset) {
    // USDC on Ethereum
    case 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48':
      return toAssetId({
        chainId,
        assetNamespace,
        assetReference: '0xfaB550568C688d5D8A52C7d794cb93Edc26eC0eC',
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
    case 'eip155:43114/erc20:0xfaB550568C688d5D8A52C7d794cb93Edc26eC0eC':
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
