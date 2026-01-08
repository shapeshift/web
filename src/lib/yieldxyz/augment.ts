import type { AssetId, AssetNamespace, ChainId, ChainReference } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  CHAIN_NAMESPACE,
  fromChainId,
  toAssetId,
  toChainId,
} from '@shapeshiftoss/caip'

import type {
  AugmentedYieldBalance,
  AugmentedYieldDto,
  AugmentedYieldMechanics,
  AugmentedYieldRewardRate,
  AugmentedYieldRewardRateComponent,
  AugmentedYieldToken,
  YieldBalance,
  YieldDto,
  YieldMechanics,
  YieldRewardRate,
  YieldRewardRateComponent,
  YieldToken,
} from './types'
import { yieldNetworkToChainId } from './utils'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

const tokenToAssetId = (token: YieldToken, chainId: ChainId | undefined): AssetId | undefined => {
  if (!chainId) return undefined

  // 1. If we don't have a specific token address, it's the native asset of the chain.
  // We use the ChainAdapter to get the fee asset ID (native asset).
  if (!token.address) {
    const adapter = getChainAdapterManager().get(chainId)
    return adapter?.getFeeAssetId()
  }

  // 2. If we DO have an address, we construct the AssetId.
  // We determine the namespace based on the chain namespace (eip155 vs cosmos vs solana).
  // Note: This requires 'chainId' to be a valid CAIP-2 ChainId string.

  const { chainNamespace } = fromChainId(chainId)

  let assetNamespace: AssetNamespace

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      assetNamespace = ASSET_NAMESPACE.erc20
      break
    case CHAIN_NAMESPACE.CosmosSdk:
      // Cosmos tokens are usually 'ibc' or 'native', but widely vary.
      // For now, if provided an address, we assume it fits the standard 'ibc/...' or 'cw20/...' pattern
      // which 'toAssetId' handles if we pass the correct params.
      // However, Yield.xyz 'address' for Cosmos might be the denomination string itself.
      assetNamespace = 'ibc' as AssetNamespace // Simplification, might need refinement for CW20
      break
    case CHAIN_NAMESPACE.Solana:
      assetNamespace = ASSET_NAMESPACE.splToken
      break
    default:
      return undefined
  }

  try {
    return toAssetId({
      chainId,
      assetNamespace,
      assetReference: token.address,
    })
  } catch (e) {
    console.error(`Failed to construct AssetId for ${token.symbol} on ${chainId}`, e)
    return undefined
  }
}

// Parse numeric EVM network ID from API's chainId field (e.g., "1" for Ethereum)
// Returns string like "1", "137", etc. - must be validated against CHAIN_REFERENCE
const parseEvmNetworkId = (chainIdStr: string): string | undefined => {
  const parsed = parseInt(chainIdStr, 10)
  return Number.isFinite(parsed) ? String(parsed) : undefined
}

const chainIdFromYieldDto = (yieldDto: YieldDto): ChainId | undefined => {
  const fromNetwork = yieldNetworkToChainId(yieldDto.network)
  if (fromNetwork) return fromNetwork

  const evmNetworkId = parseEvmNetworkId(yieldDto.chainId)
  if (evmNetworkId) {
    return toChainId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: evmNetworkId as ChainReference,
    })
  }

  return undefined
}

export const augmentYieldToken = (
  token: YieldToken,
  fallbackChainId?: ChainId,
): AugmentedYieldToken => {
  const chainId = yieldNetworkToChainId(token.network) ?? fallbackChainId
  const assetId = tokenToAssetId(token, chainId)
  return { ...token, chainId, assetId }
}

const augmentRewardRateComponent = (
  component: YieldRewardRateComponent,
  fallbackChainId?: ChainId,
): AugmentedYieldRewardRateComponent => ({
  ...component,
  token: augmentYieldToken(component.token, fallbackChainId),
})

const augmentRewardRate = (
  rewardRate: YieldRewardRate,
  fallbackChainId?: ChainId,
): AugmentedYieldRewardRate => ({
  ...rewardRate,
  components: rewardRate.components.map(c => augmentRewardRateComponent(c, fallbackChainId)),
})

const augmentMechanics = (
  mechanics: YieldMechanics,
  fallbackChainId?: ChainId,
): AugmentedYieldMechanics => ({
  ...mechanics,
  gasFeeToken: augmentYieldToken(mechanics.gasFeeToken, fallbackChainId),
})

export const augmentYield = (yieldDto: YieldDto): AugmentedYieldDto => {
  const chainId = chainIdFromYieldDto(yieldDto)
  const evmNetworkId = parseEvmNetworkId(yieldDto.chainId)

  return {
    ...yieldDto,
    chainId,
    evmNetworkId,
    token: augmentYieldToken(yieldDto.token, chainId),
    inputTokens: yieldDto.inputTokens.map(t => augmentYieldToken(t, chainId)),
    outputToken: yieldDto.outputToken
      ? augmentYieldToken(yieldDto.outputToken, chainId)
      : undefined,
    rewardRate: augmentRewardRate(yieldDto.rewardRate, chainId),
    mechanics: augmentMechanics(yieldDto.mechanics, chainId),
    tokens: yieldDto.tokens?.map(t => augmentYieldToken(t, chainId)) ?? [],
    state: yieldDto.state,
  }
}

export const augmentYieldBalance = (
  balance: YieldBalance,
  fallbackChainId?: ChainId,
): AugmentedYieldBalance => ({
  ...balance,
  token: augmentYieldToken(balance.token, fallbackChainId),
})

export const augmentYieldBalances = (
  balances: YieldBalance[],
  fallbackChainId?: ChainId,
): AugmentedYieldBalance[] => balances.map(b => augmentYieldBalance(b, fallbackChainId))

// TODO: Quadruple check all augmentation logic in this file - verify:
// - All network string to ChainId mappings are correct
// - All token augmentation includes proper assetId derivation
// - Fallback chainId logic is sound for edge cases
// - No data loss during Omit/spread operations
