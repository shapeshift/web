import { fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isToken } from '@shapeshiftoss/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'

import { useEvmFees } from '@/hooks/queries/useEvmFees'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { MaybeApproveInput } from '@/lib/utils/evm/types'
import { reactQueries } from '@/react-queries'
import { useAllowance } from '@/react-queries/hooks/useAllowance'

type UseApproveProps = MaybeApproveInput & {
  onSuccess?: (txHash: string) => void
}

export const useApprove = ({ onSuccess: handleSuccess, ...input }: UseApproveProps) => {
  const queryClient = useQueryClient()
  const wallet = useWallet().state.wallet

  const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null)

  const chainId = useMemo(
    () => (input.assetId ? fromAssetId(input.assetId).chainId : undefined),
    [input.assetId],
  )

  const approvalCallData = useMemo(() => {
    if (!(input.spender && input.amountCryptoBaseUnit)) return

    return encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [getAddress(input.spender), BigInt(input.amountCryptoBaseUnit)],
    })
  }, [input.amountCryptoBaseUnit, input.spender])

  const maybeInputWithWallet = useMemo(
    () => ({ ...input, wallet: wallet ?? undefined, data: approvalCallData }),
    [approvalCallData, input, wallet],
  )

  const approvalFeesQueryInput = useMemo(
    () => ({
      value: '0',
      from: input.from,
      accountNumber: input.accountNumber,
      to: input.assetId ? fromAssetId(input.assetId).assetReference : undefined,
      data: approvalCallData,
      chainId,
    }),
    [approvalCallData, chainId, input.accountNumber, input.assetId, input.from],
  )

  const allowanceDataQuery = useAllowance({
    assetId: input.assetId,
    spender: input.spender,
    from: input.from,
    isRefetchEnabled: true,
  })

  const isApprovalRequired = useMemo(() => {
    if (!(input.assetId && input.amountCryptoBaseUnit && chainId)) return false
    if (!(isEvmChainId(chainId) && isToken(input.assetId))) return false

    if (!allowanceDataQuery?.data) return

    const allowanceCryptoBaseUnit = allowanceDataQuery.data
    return bnOrZero(input.amountCryptoBaseUnit).gt(allowanceCryptoBaseUnit)
  }, [allowanceDataQuery.data, chainId, input.amountCryptoBaseUnit, input.assetId])

  const approvalFeesQuery = useEvmFees({
    ...approvalFeesQueryInput,
    enabled: Boolean(isApprovalRequired),
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    refetchInterval: isApprovalRequired ? 15_000 : false,
  })

  const approveMutation = useMutation({
    ...reactQueries.mutations.approve(maybeInputWithWallet),
    onSuccess: (txHash: string) => {
      handleSuccess?.(txHash)
      if (!(input.assetId && input.spender && input.from)) return

      queryClient.invalidateQueries(
        reactQueries.common.allowanceCryptoBaseUnit(input.assetId, input.spender, input.from),
      )
    },
  })

  return {
    isApprovalRequired,
    allowanceDataQuery,
    approveMutation,
    approvalFeesQuery,
    approvalTxHash,
    setApprovalTxHash,
  }
}
