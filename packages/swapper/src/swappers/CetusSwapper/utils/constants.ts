import type { ChainId } from '@shapeshiftoss/caip'
import { suiChainId } from '@shapeshiftoss/caip'

export const SUPPORTED_CETUS_CHAIN_IDS: readonly ChainId[] = [suiChainId]

export const isSupportedChainId = (
  chainId: ChainId,
): chainId is (typeof SUPPORTED_CETUS_CHAIN_IDS)[number] => {
  return SUPPORTED_CETUS_CHAIN_IDS.includes(chainId)
}

export const PYTH_DEPENDENT_PROVIDERS = ['HAEDALPMM', 'HAEDALHMMV2', 'METASTABLE']

// Placeholder sender for walletless rate fee estimation - dry-run needs a sender, real coins aren't required
export const CETUS_FEE_ESTIMATE_DUMMY_ADDRESS =
  '0x0000000000000000000000000000000000000000000000000000000000000000'
