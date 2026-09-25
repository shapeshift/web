import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { SwapperDeps, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { isToken } from '@shapeshiftoss/utils'
import type { Address } from 'viem'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'

import { extractTransactionData } from './extractTransactionData'
import type { ApiQuoteStep, ApprovalInfo } from './types'

export const getEvmChainIdNumber = (chainId: string): number => {
  const { chainReference } = fromChainId(chainId)
  return parseInt(chainReference, 10)
}

const NO_APPROVAL: ApprovalInfo = { isRequired: false, spender: '', approvalTxs: [] }

// USDT-style tokens require resetting a non-zero allowance before changing it - detected by
// simulating the approve as the owner, so no token list is needed. A revert, a false return,
// a non-standard (return-less) token, or a transient RPC failure all land on the reset side -
// a spurious approve(spender, 0) is a harmless extra transaction, never an unexecutable quote
const buildEvmApprovalInfo = async (step: TradeQuoteStep, owner: string): Promise<ApprovalInfo> => {
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

  const approveData = (amount: bigint) =>
    encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [getAddress(spender), amount],
    })

  const approveTx = { to: tokenAddress, data: approveData(requiredAmount), value: '0' }

  const needsReset =
    allowance > 0n &&
    (await client
      .simulateContract({
        account: getAddress(owner),
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [getAddress(spender), requiredAmount],
      })
      .then(({ result }) => result === false)
      .catch(() => true))

  const resetTx = { to: tokenAddress, data: approveData(0n), value: '0' }

  return {
    isRequired: true,
    spender,
    approvalTxs: needsReset ? [resetTx, approveTx] : [approveTx],
  }
}

// TRC20: the TVM ABI is EVM-compatible with addresses as 20-byte bodies; reset detection simulates
// the approve as the owner, and a revert lands on the reset side
const buildTronApprovalInfo = async (
  step: TradeQuoteStep,
  owner: string,
  adapter: tron.ChainAdapter,
): Promise<ApprovalInfo> => {
  const spender = tron.toTronBase58(step.allowanceContract)
  const tokenAddress = fromAssetId(step.sellAsset.assetId).assetReference
  const { httpProvider } = adapter

  const allowance = BigInt(
    await httpProvider.getTrc20Allowance({ contractAddress: tokenAddress, owner, spender }),
  )

  const requiredAmount = BigInt(step.sellAmountIncludingProtocolFeesCryptoBaseUnit)

  if (allowance >= requiredAmount) return { isRequired: false, spender, approvalTxs: [] }

  const approveData = (amount: bigint) =>
    encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [tron.toTronHex(spender) as Address, amount],
    })

  const approveTx = { to: tokenAddress, data: approveData(requiredAmount), value: '0' }

  const needsReset =
    allowance > 0n &&
    (await httpProvider
      .estimateContractCallFee({ contractAddress: tokenAddress, from: owner, data: approveTx.data })
      .then(() => false)
      .catch(() => true))

  const resetTx = { to: tokenAddress, data: approveData(0n), value: '0' }

  return {
    isRequired: true,
    spender,
    approvalTxs: needsReset ? [resetTx, approveTx] : [approveTx],
  }
}

export const buildApprovalInfo = (
  step: TradeQuoteStep,
  owner: string,
  deps: SwapperDeps,
): Promise<ApprovalInfo> => {
  if (!isToken(step.sellAsset.assetId) || !step.allowanceContract)
    return Promise.resolve(NO_APPROVAL)

  const { chainNamespace } = fromChainId(step.sellAsset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return buildEvmApprovalInfo(step, owner)
    case CHAIN_NAMESPACE.Tron:
      return buildTronApprovalInfo(
        step,
        owner,
        deps.assertGetTronChainAdapter(step.sellAsset.chainId),
      )
    default:
      return Promise.resolve(NO_APPROVAL)
  }
}

// Transform quote step to API format
export const transformQuoteStep = (step: TradeQuoteStep): ApiQuoteStep => ({
  sellAsset: step.sellAsset,
  buyAsset: step.buyAsset,
  sellAmountCryptoBaseUnit: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
  allowanceContract:
    fromChainId(step.sellAsset.chainId).chainNamespace === CHAIN_NAMESPACE.Tron
      ? tron.toTronBase58(step.allowanceContract)
      : step.allowanceContract,
  estimatedExecutionTimeMs: step.estimatedExecutionTimeMs,
  source: step.source,
  transactionData: extractTransactionData(step),
})
