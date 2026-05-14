import type { ChainId } from '@shapeshiftoss/caip'
import { aptosChainId } from '@shapeshiftoss/caip'

export const SUPPORTED_PANORA_CHAIN_IDS: readonly ChainId[] = [aptosChainId]

export const isSupportedChainId = (
  chainId: ChainId,
): chainId is (typeof SUPPORTED_PANORA_CHAIN_IDS)[number] => {
  return SUPPORTED_PANORA_CHAIN_IDS.includes(chainId)
}

export const PANORA_NATIVE_TOKEN_ADDRESS = '0xa'
export const PANORA_DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005'
