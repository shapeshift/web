import { Button } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text/Text'
import { usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import {
  selectBuyAmountCryptoBaseUnit,
  selectInputSellAmountCryptoBaseUnit,
} from 'state/slices/limitOrderInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteBuyAsset,
  selectActiveQuoteSellAsset,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppSelector } from 'state/store'

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

  const handleBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const [_placeLimitOrder, { data: _data, error: _error, isLoading }] = usePlaceLimitOrderMutation()

  const handleConfirm = useCallback(() => {
    console.log('handleConfirm')
  }, [])

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

  const button = useMemo(() => {
    // FIXME: make dynamic base on state (reset, approve, place order)
    return (
      <Button
        colorScheme={'blue'}
        size='lg'
        width='full'
        onClick={handleConfirm}
        isLoading={isLoading}
        isDisabled={isLoading || !activeQuote}
      >
        <Text translation={'limitOrder.placeOrder'} />
      </Button>
    )
  }, [activeQuote, handleConfirm, isLoading])

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
