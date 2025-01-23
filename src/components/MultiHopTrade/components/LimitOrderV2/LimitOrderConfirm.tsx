import { Button } from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useEffect, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text/Text'
import { useActions } from 'hooks/useActions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import {
  selectBuyAmountCryptoBaseUnit,
  selectInputSellAmountCryptoBaseUnit,
} from 'state/slices/limitOrderInputSlice/selectors'
import { LimitOrderSubmissionState } from 'state/slices/limitOrderSlice/constants'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import {
  selectActiveQuote,
  selectActiveQuoteBuyAsset,
  selectActiveQuoteId,
  selectActiveQuoteSellAsset,
  selectLimitOrderSubmissionMetadata,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { useSetIsApprovalInitiallyNeeded } from '../LimitOrder/hooks/useSetIsApprovalInitiallyNeeded'
import { LimitOrderRoutePaths } from '../LimitOrder/types'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { SharedConfirmBody } from '../SharedConfirm/SharedConfirmBody'
import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { InnerSteps } from './InnerSteps'
import { LimitOrderDetail } from './LimitOrderDetail'
import { useAllowanceApproval } from './useAllowanceApproval'
import { useAllowanceReset } from './useAllowanceReset'

export const LimitOrderConfirm = () => {
  const history = useHistory()
  const { confirmSubmit } = useActions(limitOrderSlice.actions)
  const wallet = useWallet().state.wallet

  const activeQuote = useAppSelector(selectActiveQuote)
  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = useAppSelector(selectBuyAmountCryptoBaseUnit)
  const quoteId = useAppSelector(selectActiveQuoteId)

  const { isLoading: isLoadingSetIsApprovalInitiallyNeeded } = useSetIsApprovalInitiallyNeeded()

  useEffect(() => {
    if (isLoadingSetIsApprovalInitiallyNeeded) return
    if (!quoteId) return
    confirmSubmit(quoteId)
  }, [confirmSubmit, isLoadingSetIsApprovalInitiallyNeeded, quoteId])

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { quoteId: quoteId ?? 0 }
  }, [quoteId])

  const {
    state: orderSubmissionState,
    allowanceReset,
    allowanceApproval,
  } = useSelectorWithArgs(selectLimitOrderSubmissionMetadata, orderSubmissionMetadataFilter)

  const { allowanceApprovalMutation, isLoading: isLoadingAllowanceApproval } = useAllowanceApproval(
    {
      activeQuote,
      feeQueryEnabled: true,
      isInitiallyRequired: !!allowanceApproval.isInitiallyRequired && !!activeQuote,
    },
  )

  const { allowanceResetMutation, isLoading: isLoadingAllowanceReset } = useAllowanceReset({
    activeQuote,
    feeQueryEnabled: true,
    isInitiallyRequired: !!allowanceReset.isInitiallyRequired && !!activeQuote,
  })

  const handleBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const [placeLimitOrder, { data: _data, error: _error, isLoading: isLoadingLimitOrderPlacement }] =
    usePlaceLimitOrderMutation()

  const body = useMemo(() => {
    if (!sellAsset || !buyAsset) return null
    return (
      <SharedConfirmBody
        InnerSteps={InnerSteps}
        sellAsset={sellAsset}
        buyAsset={buyAsset}
        sellAmountCryptoBaseUnit={sellAmountCryptoBaseUnit}
        buyAmountCryptoBaseUnit={buyAmountCryptoBaseUnit}
      />
    )
  }, [buyAmountCryptoBaseUnit, buyAsset, sellAmountCryptoBaseUnit, sellAsset])

  const detail = useMemo(() => {
    return <LimitOrderDetail />
  }, [])

  const buttonTranslation: string | [string, number | InterpolationOptions] | undefined =
    useMemo(() => {
      switch (orderSubmissionState) {
        case LimitOrderSubmissionState.AwaitingAllowanceApproval:
          return ['trade.approveAsset', { symbol: sellAsset?.symbol }]
        case LimitOrderSubmissionState.AwaitingAllowanceReset:
          return 'trade.resetAllowance'
        case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
          return 'limitOrder.placeOrder'
        default:
          return undefined
      }
    }, [orderSubmissionState, sellAsset?.symbol])

  const handleConfirm = useCallback(() => {
    if (!quoteId) {
      console.error('Attempting to confirm with undefined quoteId')
      return
    }
    switch (orderSubmissionState) {
      case LimitOrderSubmissionState.AwaitingAllowanceApproval:
        allowanceApprovalMutation.mutate()
        break
      case LimitOrderSubmissionState.AwaitingAllowanceReset:
        allowanceResetMutation.mutate()
        break
      case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
        placeLimitOrder({ quoteId, wallet })
        break
      default:
        break
    }
  }, [
    allowanceApprovalMutation,
    allowanceResetMutation,
    orderSubmissionState,
    placeLimitOrder,
    quoteId,
    wallet,
  ])

  const button = useMemo(() => {
    if (!buttonTranslation) return null
    return (
      <Button
        colorScheme={'blue'}
        size='lg'
        width='full'
        onClick={handleConfirm}
        isLoading={
          isLoadingLimitOrderPlacement ||
          isLoadingSetIsApprovalInitiallyNeeded ||
          isLoadingAllowanceApproval ||
          isLoadingAllowanceReset
        }
        isDisabled={isLoadingLimitOrderPlacement || !activeQuote}
      >
        <Text translation={buttonTranslation} />
      </Button>
    )
  }, [
    buttonTranslation,
    handleConfirm,
    isLoadingLimitOrderPlacement,
    isLoadingSetIsApprovalInitiallyNeeded,
    isLoadingAllowanceApproval,
    isLoadingAllowanceReset,
    activeQuote,
  ])

  const footer = useMemo(() => {
    return <SharedConfirmFooter detail={detail} button={button} />
  }, [detail, button])

  if (!body) return null
  return (
    <SharedConfirm
      bodyContent={body}
      footerContent={footer}
      isLoading={isLoadingLimitOrderPlacement}
      onBack={handleBack}
      headerTranslation={'limitOrder.confirm'}
    />
  )
}
