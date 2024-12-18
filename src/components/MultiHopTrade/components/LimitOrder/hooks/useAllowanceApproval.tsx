import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { COW_SWAP_VAULT_RELAYER_ADDRESS } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import type { Hash } from 'viem'
import {
  AllowanceType,
  getApprovalAmountCryptoBaseUnit,
  useApprovalFees,
} from 'hooks/queries/useApprovalFees'
import { useIsAllowanceApprovalRequired } from 'hooks/queries/useIsAllowanceApprovalRequired'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { LimitOrderActiveQuote } from 'state/slices/limitOrderSlice/types'
import { selectAccountNumberByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseAllowanceApprovalProps = {
  activeQuote: LimitOrderActiveQuote
  setTxHash: (txHash: string) => void
  feeQueryEnabled: boolean
  isInitiallyRequired: boolean
  onMutate: () => void
  onError: (err: Error) => void
  onSuccess: () => void
}

// handles allowance approval tx execution, fees, and state orchestration
export const useAllowanceApproval = ({
  activeQuote,
  setTxHash,
  feeQueryEnabled,
  isInitiallyRequired,
  onMutate,
  onError,
  onSuccess,
}: UseAllowanceApprovalProps) => {
  const wallet = useWallet().state.wallet ?? undefined

  const accountNumberFilter = useMemo(
    () => ({ accountId: activeQuote.params.accountId }),
    [activeQuote.params.accountId],
  )
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      amountCryptoBaseUnit: activeQuote.params.sellAmountCryptoBaseUnit,
      assetId: activeQuote.params.sellAssetId,
      from: activeQuote.params.sellAccountAddress,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    })

  const { evmFeesResult } = useApprovalFees({
    amountCryptoBaseUnit: activeQuote.params.sellAmountCryptoBaseUnit,
    assetId: activeQuote.params.sellAssetId,
    from: activeQuote.params.sellAccountAddress,
    allowanceType: AllowanceType.Unlimited, // TODO: Maybe add an exact/unlimited toggle, or wait for full flow coming soon.
    spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
    enabled: isInitiallyRequired && feeQueryEnabled,
  })
  useEffect(() => {
    if (!feeQueryEnabled || !isInitiallyRequired || isAllowanceApprovalRequired !== false) return

    // Mark the whole allowance approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    onSuccess()
  }, [feeQueryEnabled, isAllowanceApprovalRequired, isInitiallyRequired, onSuccess])

  const approveMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber,
      amountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
        activeQuote.params.sellAmountCryptoBaseUnit,
        AllowanceType.Unlimited, // TODO: Maybe add an exact/unlimited toggle, or wait for full flow
      ),
      assetId: activeQuote.params.sellAssetId,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
      from: activeQuote.params.sellAccountAddress,
      wallet,
    }),
    onMutate,
    async onSuccess(txHash) {
      setTxHash(txHash)

      const publicClient = assertGetViemClient(activeQuote.params.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

      onSuccess()
    },
    onError,
  })

  return {
    isLoading: allowanceCryptoBaseUnitResult.isLoading || evmFeesResult.isLoading,
    approveMutation,
    approvalNetworkFeeCryptoBaseUnit: evmFeesResult.data?.networkFeeCryptoBaseUnit,
  }
}
