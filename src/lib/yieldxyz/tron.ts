import type { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapterError, tron } from '@shapeshiftoss/chain-adapters'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'

import { assertGetTronChainAdapter } from '@/lib/utils/tron'

export type TronContractCall = { to: string; value: string; data: string; feeLimit?: string }

// yield.xyz hands tron stakes back as a raw TriggerSmartContract; its call is what a fee simulation needs
export const getTronContractCallFromUnsignedTransaction = (
  unsignedTransaction: string,
): TronContractCall | undefined => {
  try {
    const rawData = (JSON.parse(unsignedTransaction) as Partial<unchained.tron.TronTx>).raw_data
    const contract = rawData?.contract?.[0]
    if (contract?.type !== 'TriggerSmartContract') return

    const { contract_address, data, call_value } = contract.parameter?.value ?? {}
    if (!contract_address || !data) return

    return {
      to: tron.toTronBase58(contract_address),
      data,
      value: String(call_value ?? 0),
      feeLimit: rawData?.fee_limit?.toString(),
    }
  } catch {
    return
  }
}

type AssertTronYieldFeeCoveredArgs = {
  chainId: ChainId
  unsignedTransaction: string
  from: string
  symbol: string
}

// Tron burns whatever TRX is left when a call runs out of energy, so a call is priced against the live balance and its own fee limit right before it is signed
export const assertTronYieldFeeCovered = async ({
  chainId,
  unsignedTransaction,
  from,
  symbol,
}: AssertTronYieldFeeCoveredArgs): Promise<void> => {
  const call = getTronContractCallFromUnsignedTransaction(unsignedTransaction)
  if (!call) return

  const adapter = assertGetTronChainAdapter(chainId)

  const [{ fast }, account] = await Promise.all([
    adapter.getFeeData({
      to: call.to,
      value: call.value,
      sendMax: false,
      chainSpecific: { from, data: call.data },
    }),
    adapter.getAccount(from),
  ])

  if (call.feeLimit && bnOrZero(fast.txFee).gt(call.feeLimit)) {
    throw new ChainAdapterError(
      `tron fee_limit ${call.feeLimit} is below the simulated fee ${fast.txFee}`,
      { translation: 'yieldXYZ.errors.tronFeeLimitBelowEstimate' },
    )
  }

  if (bnOrZero(call.value).plus(fast.txFee).gt(account.balance)) {
    throw new ChainAdapterError('insufficient balance for the network fee', {
      translation: 'yieldXYZ.errors.insufficientAssetForGas',
      options: { symbol },
    })
  }
}
