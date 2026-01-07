import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

export const AVNU_SUPPORTED_CHAIN_IDS: readonly ChainId[] = [KnownChainIds.StarknetMainnet] as const

export const isSupportedChainId = (
  chainId: ChainId,
): chainId is (typeof AVNU_SUPPORTED_CHAIN_IDS)[number] => {
  return AVNU_SUPPORTED_CHAIN_IDS.includes(chainId)
}

export const DEFAULT_SLIPPAGE_PERCENTAGE = '0.005'

export const AVNU_API_BASE_URL = 'https://starknet.api.avnu.fi'
