import { Button } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text/Text'
import { usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import {
  selectBuyAmountCryptoBaseUnit,
  selectInputSellAmountCryptoBaseUnit,
} from 'state/slices/limitOrderInputSlice/selectors'
import { LimitOrderSubmissionState } from 'state/slices/limitOrderSlice/constants'
import {
  selectActiveQuote,
  selectActiveQuoteBuyAsset,
  selectActiveQuoteId,
  selectActiveQuoteSellAsset,
  selectLimitOrderSubmissionMetadata,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { LimitOrderRoutePaths } from '../LimitOrder/types'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { SharedConfirmBody } from '../SharedConfirm/SharedConfirmBody'
import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { InnerSteps } from './InnerSteps'
import { LimitOrderDetail } from './LimitOrderDetail'

export const LimitOrderConfirm = () => {
  const history = useHistory()

  const activeQuote = useAppSelector(selectActiveQuote)
  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = useAppSelector(selectBuyAmountCryptoBaseUnit)
  const quoteId = useAppSelector(selectActiveQuoteId)

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { quoteId: quoteId ?? 0 }
  }, [quoteId])

  const {
    state: orderSubmissionState,
    allowanceReset: _allowanceReset,
    allowanceApproval: _allowanceApproval,
  } = useSelectorWithArgs(selectLimitOrderSubmissionMetadata, orderSubmissionMetadataFilter)

  const handleBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const [_placeLimitOrder, { data: _data, error: _error, isLoading }] = usePlaceLimitOrderMutation()

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

  const buttonTranslation = useMemo(() => {
    switch (orderSubmissionState) {
      case LimitOrderSubmissionState.AwaitingAllowanceApproval:
        return 'limitOrder.resetAllowance'
      case LimitOrderSubmissionState.AwaitingAllowanceReset:
        return 'limitOrder.approveAllowance'
      case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
        return 'limitOrder.placeOrder'
      default:
        return undefined
    }
  }, [orderSubmissionState])

  const handleConfirm = useCallback(() => {
    switch (orderSubmissionState) {
      case LimitOrderSubmissionState.AwaitingAllowanceApproval:
        console.log('allowanceApproval')
        // allowanceApproval()
        break
      case LimitOrderSubmissionState.AwaitingAllowanceReset:
        console.log('allowanceReset')
        // allowanceReset()
        break
      case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
        console.log('placeLimitOrder')
        // _placeLimitOrder({ quoteId: quoteId ?? 0 })
        break
      default:
        break
    }
  }, [orderSubmissionState])

  const button = useMemo(() => {
    // FIXME: make dynamic base on state (reset, approve, place order)
    if (!buttonTranslation) return null
    return (
      <Button
        colorScheme={'blue'}
        size='lg'
        width='full'
        onClick={handleConfirm}
        isLoading={isLoading}
        isDisabled={isLoading || !activeQuote}
      >
        <Text translation={buttonTranslation} />
      </Button>
    )
  }, [activeQuote, handleConfirm, isLoading, buttonTranslation])

  const footer = useMemo(() => {
    return <SharedConfirmFooter detail={detail} button={button} />
  }, [detail, button])

  if (!body) return null
  return (
    <SharedConfirm
      bodyContent={body}
      footerContent={footer}
      isLoading={isLoading}
      onBack={handleBack}
      headerTranslation={'limitOrder.confirm'}
    />
  )
}
