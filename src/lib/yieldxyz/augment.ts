import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'

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

const tokenToAssetId = (token: YieldToken, chainId: ChainId | undefined): AssetId | undefined => {
  if (!chainId || !token.address) return undefined
  try {
    return toAssetId({
      chainId,
      assetNamespace: ASSET_NAMESPACE.erc20,
      assetReference: token.address,
    })
  } catch {
    return undefined
  }
}

const evmChainIdFromString = (chainIdStr: string): number | undefined => {
  const parsed = parseInt(chainIdStr, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

const chainIdFromYieldDto = (yieldDto: YieldDto): ChainId | undefined => {
  const fromNetwork = yieldNetworkToChainId(yieldDto.network)
  if (fromNetwork) return fromNetwork

  const evmChainId = evmChainIdFromString(yieldDto.chainId)
  if (evmChainId) return `eip155:${evmChainId}` as ChainId

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
  const evmChainId = evmChainIdFromString(yieldDto.chainId)

  return {
    ...yieldDto,
    chainId,
    evmChainId,
    token: augmentYieldToken(yieldDto.token, chainId),
    inputTokens: yieldDto.inputTokens.map(t => augmentYieldToken(t, chainId)),
    outputToken: yieldDto.outputToken
      ? augmentYieldToken(yieldDto.outputToken, chainId)
      : undefined,
    rewardRate: augmentRewardRate(yieldDto.rewardRate, chainId),
    mechanics: augmentMechanics(yieldDto.mechanics, chainId),
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
