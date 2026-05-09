import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { isToken } from '@shapeshiftoss/utils'
import { erc20Abi, getAddress } from 'viem'

import { extractTransactionData } from './extractTransactionData'
import type { ApiQuoteStep, ApprovalInfo } from './types'

export const getEvmChainIdNumber = (chainId: string): number => {
  const { chainReference } = fromChainId(chainId)
  return parseInt(chainReference, 10)
}

export const buildApprovalInfo = async (
  step: TradeQuoteStep,
  owner: string,
): Promise<ApprovalInfo> => {
  const { chainNamespace } = fromChainId(step.sellAsset.chainId)

  const needsAllowanceCheck =
    chainNamespace === CHAIN_NAMESPACE.Evm &&
    isToken(step.sellAsset.assetId) &&
    Boolean(step.allowanceContract)

  if (!needsAllowanceCheck) return { isRequired: false, spender: '' }

  const spender = step.allowanceContract
  const client = viemClientByChainId[step.sellAsset.chainId]

  const allowance = await client.readContract({
    address: getAddress(fromAssetId(step.sellAsset.assetId).assetReference),
    abi: erc20Abi,
    functionName: 'allowance',
    args: [getAddress(owner), getAddress(spender)],
  })

  const requiredAmount = BigInt(step.sellAmountIncludingProtocolFeesCryptoBaseUnit)

  return { isRequired: allowance < requiredAmount, spender }
}

// Transform quote step to API format
export const transformQuoteStep = (step: TradeQuoteStep): ApiQuoteStep => ({
  sellAsset: step.sellAsset,
  buyAsset: step.buyAsset,
  sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
  allowanceContract: step.allowanceContract,
  estimatedExecutionTimeMs: step.estimatedExecutionTimeMs,
  source: step.source,
  transactionData: extractTransactionData(step),
})
