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

// Panora routes integrator fees on-chain only when integratorFeeAddress accompanies
// integratorFeePercentage; the percentage alone is still deducted from the user but kept
// by Panora (verified against the live /swap API). Leave unset until the DAO has an Aptos
// treasury address (the DAO_TREASURY_APTOS placeholder was removed during review for the
// same reason).
export const PANORA_INTEGRATOR_FEE_ADDRESS: string | undefined = undefined
