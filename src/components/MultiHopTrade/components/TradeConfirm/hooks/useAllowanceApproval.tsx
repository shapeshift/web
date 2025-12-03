import { fromAccountId, tronChainId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { isGridPlus } from '@shapeshiftoss/hdwallet-gridplus'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { Hash } from 'viem'

import type { AllowanceType } from '@/hooks/queries/useApprovalFees'
import { getApprovalAmountCryptoBaseUnit, useApprovalFees } from '@/hooks/queries/useApprovalFees'
import { useIsAllowanceApprovalRequired } from '@/hooks/queries/useIsAllowanceApprovalRequired'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { reactQueries } from '@/react-queries'
import { selectHopSellAccountId } from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

// handles allowance approval tx execution, fees, and state orchestration
export const useAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  allowanceType: AllowanceType,
  feeQueryEnabled: boolean,
  confirmedTradeId: TradeQuote['id'],
  isInitiallyRequired: boolean,
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorToast()
  const wallet = useWallet().state.wallet ?? undefined

  const hopSellAccountIdFilter = useMemo(() => ({ hopIndex }), [hopIndex])
  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      amountCryptoBaseUnit: tradeQuoteStep?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      assetId: tradeQuoteStep?.sellAsset.assetId,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      spender: tradeQuoteStep?.allowanceContract,
    })

  const { evmFeesResult } = useApprovalFees({
    amountCryptoBaseUnit: tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    assetId: tradeQuoteStep.sellAsset.assetId,
    from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
    allowanceType,
    spender: tradeQuoteStep.allowanceContract,
    enabled: isInitiallyRequired && feeQueryEnabled,
    isRefetchEnabled: true,
  })
  useEffect(() => {
    if (!feeQueryEnabled || !isInitiallyRequired || isAllowanceApprovalRequired !== false) return

    // Mark the whole allowance approval step complete if adequate allowance was found.
    // This is deliberately disjoint to the approval transaction orchestration to allow users to
    // complete an approval externally and have the app respond to the updated allowance on chain.
    dispatch(
      tradeQuoteSlice.actions.setAllowanceApprovalStepComplete({ hopIndex, id: confirmedTradeId }),
    )
  }, [
    dispatch,
    hopIndex,
    isAllowanceApprovalRequired,
    confirmedTradeId,
    isInitiallyRequired,
    feeQueryEnabled,
  ])

  const approvalAmountCryptoBaseUnit = useMemo(
    () =>
      getApprovalAmountCryptoBaseUnit(
        tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        allowanceType,
      ),
    [tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit, allowanceType],
  )

  const pubKey = useMemo(() => {
    const skipDeviceDerivation = wallet && (isTrezor(wallet) || isGridPlus(wallet))
    if (!skipDeviceDerivation || !sellAssetAccountId) return undefined
    return fromAccountId(sellAssetAccountId).account
  }, [wallet, sellAssetAccountId])

  const approveMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber: tradeQuoteStep.accountNumber,
      amountCryptoBaseUnit: approvalAmountCryptoBaseUnit,
      assetId: tradeQuoteStep.sellAsset.assetId,
      spender: tradeQuoteStep.allowanceContract,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      wallet,
      pubKey,
    }),
    onMutate() {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceApprovalTxPending({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
    },
    onSuccess: async txHash => {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceApprovalTxHash({
          hopIndex,
          txHash,
          id: confirmedTradeId,
        }),
      )

      if (!tradeQuoteStep?.sellAsset || !sellAssetAccountId) return

      // Handle TRON transaction confirmation
      if (tradeQuoteStep.sellAsset.chainId === tronChainId) {
        const adapter = await import('@/lib/utils').then(m =>
          m.assertGetTronChainAdapter(tronChainId),
        )
        const rpcUrl = adapter.httpProvider.getRpcUrl()

        // Poll for transaction confirmation (TRON doesn't have waitForTransactionReceipt)
        let confirmed = false
        let attempts = 0
        const maxAttempts = 60 // 60 seconds max (TRON can be slow)

        while (!confirmed && attempts < maxAttempts) {
          try {
            // Try walletsolidity first (confirmed txs), fallback to wallet (recent txs)
            const endpoint = attempts < 20 ? '/wallet/gettransactionbyid' : '/walletsolidity/gettransactionbyid'
            const response = await fetch(`${rpcUrl}${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ value: txHash }),
            })

            if (response.ok) {
              const tx = await response.json()
              const contractRet = tx?.ret?.[0]?.contractRet

              if (contractRet === 'SUCCESS') {
                confirmed = true
              } else if (contractRet === 'REVERT' || contractRet === 'OUT_OF_ENERGY') {
                throw new Error(`Transaction failed: ${contractRet}`)
              }
              // If no contractRet yet, continue polling
            }
          } catch (err) {
            // Continue polling on errors unless it's a failure
            if (err instanceof Error && err.message.includes('Transaction failed')) {
              throw err
            }
          }

          if (!confirmed) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            attempts++
          }
        }

        if (!confirmed) {
          console.warn('[TRON] Transaction confirmation timeout, but transaction may still succeed')
          // Don't throw - approval might have succeeded even if we couldn't confirm
        }
      } else {
        // Handle EVM transaction confirmation
        const publicClient = assertGetViemClient(tradeQuoteStep.sellAsset.chainId)
        await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })
      }

      dispatch(
        tradeQuoteSlice.actions.setAllowanceApprovalTxComplete({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
    },
    onError(err) {
      dispatch(
        tradeQuoteSlice.actions.setAllowanceApprovalTxFailed({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
      showErrorToast(err)
    },
  })

  return {
    isLoading: allowanceCryptoBaseUnitResult.isLoading || evmFeesResult.isLoading,
    approveMutation,
    approvalNetworkFeeCryptoBaseUnit: evmFeesResult.data?.networkFeeCryptoBaseUnit,
  }
}
