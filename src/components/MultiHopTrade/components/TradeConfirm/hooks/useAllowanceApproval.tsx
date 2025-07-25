import { fromAccountId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Hash } from 'viem'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import {
  AllowanceType,
  getApprovalAmountCryptoBaseUnit,
  useApprovalFees,
} from '@/hooks/queries/useApprovalFees'
import { useIsAllowanceApprovalRequired } from '@/hooks/queries/useIsAllowanceApprovalRequired'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { fromBaseUnit } from '@/lib/math'
import { reactQueries } from '@/react-queries'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
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
  const translate = useTranslate()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const dispatch = useAppDispatch()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
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

  const approveMutation = useMutation({
    ...reactQueries.mutations.approve({
      accountNumber: tradeQuoteStep.accountNumber,
      amountCryptoBaseUnit: approvalAmountCryptoBaseUnit,
      assetId: tradeQuoteStep.sellAsset.assetId,
      spender: tradeQuoteStep.allowanceContract,
      from: sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined,
      wallet,
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

      const amountCryptoPrecision =
        allowanceType === AllowanceType.Unlimited
          ? 'Infinite ∞'
          : fromBaseUnit(approvalAmountCryptoBaseUnit, tradeQuoteStep.sellAsset.precision)

      dispatch(
        actionSlice.actions.upsertAction({
          id: txHash,
          type: ActionType.Approve,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.Approve,
            txHash,
            chainId: tradeQuoteStep.sellAsset.chainId,
            accountId: sellAssetAccountId,
            amountCryptoPrecision,
            assetId: tradeQuoteStep.sellAsset.assetId,
            contractName: tradeQuoteStep.source,
            message: translate('actionCenter.approve.approvalTxPending', {
              contractName: tradeQuoteStep.source,
              amountCryptoPrecision,
              symbol: tradeQuoteStep.sellAsset.symbol,
            }),
          },
        }),
      )

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              // eslint-disable-next-line react-memo/require-usememo
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      const publicClient = assertGetViemClient(tradeQuoteStep.sellAsset.chainId)
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })

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
