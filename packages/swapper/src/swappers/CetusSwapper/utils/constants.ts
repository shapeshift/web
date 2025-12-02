import type { ChainId } from '@shapeshiftoss/caip'
import { suiChainId } from '@shapeshiftoss/caip'

export const SUPPORTED_CETUS_CHAIN_IDS: readonly ChainId[] = [suiChainId]

export const isSupportedChainId = (
  chainId: ChainId,
): chainId is (typeof SUPPORTED_CETUS_CHAIN_IDS)[number] => {
  return SUPPORTED_CETUS_CHAIN_IDS.includes(chainId)
}
