import { InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Heading,
  HStack,
  Stack,
} from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { CowSwapError } from '@shapeshiftoss/types'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetToAssetCard } from 'components/AssetToAssetCard/AssetToAssetCard'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import { useActions } from 'hooks/useActions'
import { useErrorToast } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import {
  selectActiveQuote,
  selectActiveQuoteBuyAmountCryptoPrecision,
  selectActiveQuoteBuyAmountUserCurrency,
  selectActiveQuoteBuyAsset,
  selectActiveQuoteExpirationTimestamp,
  selectActiveQuoteFeeAsset,
  selectActiveQuoteLimitPrice,
  selectActiveQuoteNetworkFeeCryptoPrecision,
  selectActiveQuoteSellAmountCryptoPrecision,
  selectActiveQuoteSellAmountUserCurrency,
  selectActiveQuoteSellAsset,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppSelector } from 'state/store'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { WithBackButton } from '../../WithBackButton'
import { getMixpanelLimitOrderEventData } from '../helpers'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: '2xl' }

export const LimitOrderConfirm = () => {
  const history = useHistory()
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const { confirmSubmit, setLimitOrderInitialized } = useActions(limitOrderSlice.actions)
  const { showErrorToast } = useErrorToast()
  const queryClient = useQueryClient()
  const mixpanel = getMixPanel()

  const activeQuote = useAppSelector(selectActiveQuote)
  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const feeAsset = useAppSelector(selectActiveQuoteFeeAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectActiveQuoteSellAmountCryptoPrecision)
  const buyAmountCryptoPrecision = useAppSelector(selectActiveQuoteBuyAmountCryptoPrecision)
  const sellAmountUserCurrency = useAppSelector(selectActiveQuoteSellAmountUserCurrency)
  const buyAmountUserCurrency = useAppSelector(selectActiveQuoteBuyAmountUserCurrency)
  const networkFeeCryptoPrecision = useAppSelector(selectActiveQuoteNetworkFeeCryptoPrecision)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

  const [placeLimitOrder, { data, error, isLoading }] = usePlaceLimitOrderMutation()

  useEffect(() => {
    if (!error) return

    const description = (error as CowSwapError).description ?? 'Unknown Error'

    // TODO: Actually render a translated error description.
    showErrorToast(description)
  }, [error, showErrorToast])

  useEffect(() => {
    if (!data || error) return

    history.push(LimitOrderRoutePaths.PlaceOrder)
  }, [data, error, history])

  const handleBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(async () => {
    const quoteId = activeQuote?.response.id
    const accountId = activeQuote?.params.accountId

    if (!quoteId || !accountId) {
      return
    }

    // TEMP: Bypass allowance approvals and jump straight to placing the order
    setLimitOrderInitialized(quoteId)
    confirmSubmit(quoteId)
    const result = await placeLimitOrder({ quoteId, wallet })

    // Exit if the request failed.
    if ((result as { error: unknown }).error) return

    // refetch the orders list for this account
    queryClient.invalidateQueries({
      queryKey: ['getLimitOrdersForAccount', accountId],
      refetchType: 'all',
    })

    // Track event in mixpanel
    const eventData = getMixpanelLimitOrderEventData({
      sellAsset,
      buyAsset,
      sellAmountCryptoPrecision,
      buyAmountCryptoPrecision,
    })
    if (mixpanel && eventData) {
      mixpanel.track(MixPanelEvent.LimitOrderPlaced, eventData)
    }
  }, [
    activeQuote?.params.accountId,
    activeQuote?.response.id,
    buyAmountCryptoPrecision,
    buyAsset,
    confirmSubmit,
    mixpanel,
    placeLimitOrder,
    queryClient,
    sellAmountCryptoPrecision,
    sellAsset,
    setLimitOrderInitialized,
    wallet,
  ])

  if (!activeQuote) {
    console.error('Attempted to submit an undefined limit order')
    history.push(LimitOrderRoutePaths.Input)
    return null
  }

  return (
    <SlideTransition>
      <Card
        flex={1}
        borderRadius={cardBorderRadius}
        width='full'
        variant='dashboard'
        maxWidth='500px'
        borderColor='border.base'
        bg='background.surface.raised.base'
      >
        <CardHeader px={6} pt={4} borderBottomWidth={0}>
          <WithBackButton onBack={handleBack}>
            <Heading textAlign='center' fontSize='lg'>
              <Text translation='limitOrder.confirm' />
            </Heading>
          </WithBackButton>
        </CardHeader>

        <CardBody px={6} pt={0} pb={6}>
          <AssetToAssetCard
            sellAsset={sellAsset}
            buyAsset={buyAsset}
            sellAmountCryptoPrecision={sellAmountCryptoPrecision}
            sellAmountUserCurrency={sellAmountUserCurrency}
            buyAmountCryptoPrecision={buyAmountCryptoPrecision}
            buyAmountUserCurrency={buyAmountUserCurrency}
          />
        </CardBody>
        <CardFooter
          flexDir='column'
          gap={2}
          px={4}
          borderTopWidth={0}
          bg='background.surface.raised.accent'
          fontSize='sm'
          borderBottomRadius={cardBorderRadius}
        >
          <Stack spacing={4}>
            <Row px={2}>
              <Row.Label>
                <Text translation='limitOrder.limitPrice' />
              </Row.Label>
              <Row.Value textAlign='right'>
                <HStack>
                  <Amount.Crypto value='1.0' symbol={sellAsset?.symbol ?? ''} />
                  <RawText>=</RawText>
                  <Amount.Crypto
                    value={limitPrice?.buyAssetDenomination}
                    symbol={buyAsset?.symbol ?? ''}
                  />
                </HStack>
              </Row.Value>
            </Row>
            <Row px={2}>
              <Row.Label>
                <Text translation='limitOrder.provider' />
              </Row.Label>
              <Row.Value textAlign='right'>
                <HStack>
                  <SwapperIcon swapperName={SwapperName.CowSwap} />
                  <RawText>{SwapperName.CowSwap}</RawText>
                </HStack>
              </Row.Value>
            </Row>
            <Row px={2}>
              <Row.Label>
                <Text translation='limitOrder.expiration' />
              </Row.Label>
              <TransactionDate blockTime={quoteExpirationTimestamp ?? 0} />
            </Row>
            <Row px={2}>
              <Row.Label>
                <Text translation='limitOrder.networkFee' />
              </Row.Label>
              <Amount.Crypto value={networkFeeCryptoPrecision} symbol={feeAsset?.symbol ?? ''} />
            </Row>
            <Card bg='background.surface.raised.pressed' borderRadius={6} p={4}>
              <HStack>
                <InfoIcon boxSize='1.3em' color='text.info' />
                <RawText>{translate('limitOrder.confirmInfo')}</RawText>
                {/* <Button
                    as={Link}
                    href={learnMoreUrl}
                    variant='link'
                    colorScheme='blue'
                    isExternal
                    fontWeight='normal'
                    height='auto'
                    padding={0}
                    verticalAlign='baseline'
                  >
                    <Text as='span' translation='limitOrder.learnMore' />
                  </Button> */}
              </HStack>
            </Card>
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
          </Stack>
        </CardFooter>
      </Card>
    </SlideTransition>
  )
}
