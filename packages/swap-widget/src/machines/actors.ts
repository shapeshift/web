import type { Chain, WalletClient } from 'viem'
import { encodeFunctionData, erc20Abi } from 'viem'
import { fromCallback, fromPromise } from 'xstate'

import type { ApiClient } from '../api/client'
import type { QuoteResponse } from '../types'
import type { CheckStatusParams } from '../services/transactionStatus'
import { checkTransactionStatus } from '../services/transactionStatus'

export type FetchQuoteInput = {
  apiClient: ApiClient
  sellAssetId: string
  buyAssetId: string
  sellAmountCryptoBaseUnit: string
  sendAddress: string
  receiveAddress: string
  swapperName: string
  slippageTolerancePercentageDecimal: string
}

export type ExecuteApprovalInput = {
  walletClient: WalletClient
  spender: string
  sellAssetAddress: string
  sellAmountBaseUnit: string
  chain: Chain
}

export type ExecuteSwapInput = {
  walletClient: WalletClient
  to: string
  data: string
  value: string
  gasLimit?: string
  chain: Chain
  walletAddress: string
}

export type PollStatusInput = {
  txHash: string
  chainType: CheckStatusParams['chainType']
  chainId?: number
  connection?: CheckStatusParams['connection']
}

export const fetchQuoteActor = fromPromise<QuoteResponse, FetchQuoteInput>(
  async ({ input }) => {
    const response = await input.apiClient.getQuote({
      sellAssetId: input.sellAssetId,
      buyAssetId: input.buyAssetId,
      sellAmountCryptoBaseUnit: input.sellAmountCryptoBaseUnit,
      sendAddress: input.sendAddress,
      receiveAddress: input.receiveAddress,
      swapperName: input.swapperName,
      slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
    })
    return response
  },
)

export const executeApprovalActor = fromPromise<string, ExecuteApprovalInput>(
  async ({ input }) => {
    const { walletClient, spender, sellAssetAddress, sellAmountBaseUnit, chain } = input

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender as `0x${string}`, BigInt(sellAmountBaseUnit)],
    })

    const [account] = await walletClient.getAddresses()
    const txHash = await walletClient.sendTransaction({
      account,
      to: sellAssetAddress as `0x${string}`,
      data,
      chain,
    })

    const { createPublicClient, http } = await import('viem')
    const publicClient = createPublicClient({ chain, transport: http() })
    await publicClient.waitForTransactionReceipt({ hash: txHash })

    return txHash
  },
)

export const executeSwapActor = fromPromise<string, ExecuteSwapInput>(async ({ input }) => {
  const { walletClient, to, data, value, gasLimit, chain, walletAddress } = input

  const txHash = await walletClient.sendTransaction({
    account: walletAddress as `0x${string}`,
    to: to as `0x${string}`,
    data: data as `0x${string}`,
    value: BigInt(value || '0'),
    ...(gasLimit ? { gas: BigInt(gasLimit) } : {}),
    chain,
  })

  return txHash
})

export const pollStatusActor = fromCallback<
  { type: 'STATUS_CONFIRMED' } | { type: 'STATUS_FAILED'; error: string },
  PollStatusInput
>(({ input, sendBack }) => {
  const POLL_INTERVAL_MS = 5000
  let stopped = false

  const poll = async () => {
    if (stopped) return

    try {
      const result = await checkTransactionStatus({
        txHash: input.txHash,
        chainType: input.chainType,
        chainId: input.chainId,
        connection: input.connection,
      })

      if (stopped) return

      if (result.status === 'confirmed') {
        sendBack({ type: 'STATUS_CONFIRMED' })
        return
      }

      if (result.status === 'failed') {
        sendBack({ type: 'STATUS_FAILED', error: result.error ?? 'Transaction failed' })
        return
      }

      setTimeout(poll, POLL_INTERVAL_MS)
    } catch (err) {
      if (stopped) return
      const errorMessage = err instanceof Error ? err.message : 'Unknown polling error'
      sendBack({ type: 'STATUS_FAILED', error: errorMessage })
    }
  }

  poll()

  return () => {
    stopped = true
  }
})
