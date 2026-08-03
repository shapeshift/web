import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { isToken } from '@shapeshiftoss/utils'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'

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

  if (!needsAllowanceCheck) return { isRequired: false, spender: '', approvalTxs: [] }

  const spender = step.allowanceContract
  const client = viemClientByChainId[step.sellAsset.chainId]
  const tokenAddress = getAddress(fromAssetId(step.sellAsset.assetId).assetReference)

  const allowance = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [getAddress(owner), getAddress(spender)],
  })

  const requiredAmount = BigInt(step.sellAmountIncludingProtocolFeesCryptoBaseUnit)

  if (allowance >= requiredAmount) return { isRequired: false, spender, approvalTxs: [] }

  const approveTx = {
    to: tokenAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [getAddress(spender), requiredAmount],
    }),
    value: '0',
  }

  // USDT-style tokens require resetting a non-zero allowance before changing it - detected by
  // simulating the approve as the owner, so no token list is needed
  const needsReset =
    allowance > 0n &&
    (await client
      .call({ account: getAddress(owner), to: tokenAddress, data: approveTx.data })
      .then(() => false)
      .catch(() => true))

  const resetTx = {
    to: tokenAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [getAddress(spender), 0n],
    }),
    value: '0',
  }

  return {
    isRequired: true,
    spender,
    approvalTxs: needsReset ? [resetTx, approveTx] : [approveTx],
  }
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
