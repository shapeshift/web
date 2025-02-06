import { Button, HStack, Skeleton, Stack } from '@chakra-ui/react'
import { bn, fromBaseUnit } from '@shapeshiftoss/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text/Text'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { WalletActions } from 'context/WalletProvider/actions'
import { useActions } from 'hooks/useActions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { limitOrderApi, usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import {
  selectBuyAmountCryptoBaseUnit,
  selectInputSellAmountCryptoBaseUnit,
} from 'state/slices/limitOrderInputSlice/selectors'
import { LimitOrderSubmissionState } from 'state/slices/limitOrderSlice/constants'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import {
  selectActiveQuote,
  selectActiveQuoteBuyAmountCryptoPrecision,
  selectActiveQuoteBuyAsset,
  selectActiveQuoteFeeAsset,
  selectActiveQuoteFeeAssetRateUserCurrency,
  selectActiveQuoteId,
  selectActiveQuoteSellAmountCryptoPrecision,
  selectActiveQuoteSellAsset,
  selectLimitOrderSubmissionMetadata,
} from 'state/slices/limitOrderSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from 'state/store'

import { getMixpanelLimitOrderEventData } from '../LimitOrder/helpers'
import { LimitOrderRoutePaths } from '../LimitOrder/types'
import { SharedConfirm } from '../SharedConfirm/SharedConfirm'
import { SharedConfirmBody } from '../SharedConfirm/SharedConfirmBody'
import { SharedConfirmFooter } from '../SharedConfirm/SharedConfirmFooter'
import { TradeSuccess } from '../TradeSuccess/TradeSuccess'
import { useAllowanceApproval } from './hooks/useAllowanceApproval'
import { useAllowanceReset } from './hooks/useAllowanceReset'
import { useSetIsApprovalInitiallyNeeded } from './hooks/useSetIsApprovalInitiallyNeeded'
import { InnerSteps } from './InnerSteps'
import { LimitOrderDetail } from './LimitOrderDetail'

export const LimitOrderConfirm = () => {
  const history = useHistory()
  const dispatch = useAppDispatch()
  const { confirmSubmit, setLimitOrderTxComplete, setLimitOrderTxFailed } = useActions(
    limitOrderSlice.actions,
  )
  const {
    state: { isConnected, isDemoWallet, wallet },
    dispatch: walletDispatch,
  } = useWallet()
  const activeQuote = useAppSelector(selectActiveQuote)
  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = useAppSelector(selectBuyAmountCryptoBaseUnit)
  const quoteId = useAppSelector(selectActiveQuoteId)
  const sellAmountCryptoPrecision = useAppSelector(selectActiveQuoteSellAmountCryptoPrecision)
  const quoteBuyAmountCryptoPrecision = useAppSelector(selectActiveQuoteBuyAmountCryptoPrecision)
  const feeAsset = useAppSelector(selectActiveQuoteFeeAsset)
  const feeAssetRateUserCurrency = useAppSelector(selectActiveQuoteFeeAssetRateUserCurrency)

  const mixpanel = getMixPanel()
  const hasConfirmedRef = useRef(false)

  const { isLoading: isLoadingSetIsApprovalInitiallyNeeded } = useSetIsApprovalInitiallyNeeded()

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { quoteId: quoteId ?? 0 }
  }, [quoteId])

  const {
    state: orderSubmissionState,
    allowanceReset,
    allowanceApproval,
  } = useSelectorWithArgs(selectLimitOrderSubmissionMetadata, orderSubmissionMetadataFilter)

  useEffect(() => {
    if (isLoadingSetIsApprovalInitiallyNeeded) return
    if (!quoteId) return
    if (orderSubmissionState !== LimitOrderSubmissionState.Previewing) return
    if (hasConfirmedRef.current) return
    hasConfirmedRef.current = true
    confirmSubmit(quoteId)
  }, [confirmSubmit, isLoadingSetIsApprovalInitiallyNeeded, orderSubmissionState, quoteId])

  const {
    allowanceApprovalMutation,
    isLoading: isLoadingAllowanceApproval,
    approvalNetworkFeeCryptoBaseUnit,
  } = useAllowanceApproval({
    activeQuote,
    isQueryEnabled: !!allowanceApproval.isInitiallyRequired && !!activeQuote,
    // Stop refetching when the approval tx is pending, but keep it enabled (see above) so we can leverage stale data, see
    // https://github.com/shapeshift/web/issues/8702
    isRefetchEnabled:
      orderSubmissionState === LimitOrderSubmissionState.AwaitingAllowanceApproval &&
      allowanceApproval.state !== TransactionExecutionState.Pending,
  })

  const {
    allowanceResetMutation,
    isLoading: isLoadingAllowanceReset,
    allowanceResetNetworkFeeCryptoBaseUnit,
  } = useAllowanceReset({
    activeQuote,
    isQueryEnabled: !!allowanceReset.isInitiallyRequired && !!activeQuote,
    // Stop refetching when the reset tx is pending, but keep it enabled (see above) so we can leverage stale data, see
    // https://github.com/shapeshift/web/issues/8702
    isRefetchEnabled:
      orderSubmissionState === LimitOrderSubmissionState.AwaitingAllowanceReset &&
      allowanceReset.state !== TransactionExecutionState.Pending,
  })

  const handleBack = useCallback(() => {
    dispatch(limitOrderSlice.actions.clear())
    history.push(LimitOrderRoutePaths.Input)
  }, [dispatch, history])

  const [placeLimitOrder, { data: _data, error: _error, isLoading: isLoadingLimitOrderPlacement }] =
    usePlaceLimitOrderMutation({ fixedCacheKey: quoteId as string | undefined })

  const innerStepsRendered = useMemo(() => {
    return () => <InnerSteps isLoading={isLoadingSetIsApprovalInitiallyNeeded} />
  }, [isLoadingSetIsApprovalInitiallyNeeded])

  const body = useMemo(() => {
    if (!sellAsset || !buyAsset) return null
    if (orderSubmissionState === LimitOrderSubmissionState.Complete) {
      return (
        <TradeSuccess
          titleTranslation='limitOrder.success'
          buttonTranslation={'limitOrder.placeAnotherOrder'}
          summaryTranslation={'limitOrder.orderSummary'}
          handleBack={handleBack}
          sellAsset={sellAsset}
          buyAsset={buyAsset}
          sellAmountCryptoPrecision={sellAmountCryptoPrecision}
          quoteBuyAmountCryptoPrecision={quoteBuyAmountCryptoPrecision}
        />
      )
    }
    return (
      <SharedConfirmBody
        InnerSteps={innerStepsRendered}
        sellAsset={sellAsset}
        buyAsset={buyAsset}
        sellAmountCryptoBaseUnit={sellAmountCryptoBaseUnit}
        buyAmountCryptoBaseUnit={buyAmountCryptoBaseUnit}
      />
    )
  }, [
    buyAmountCryptoBaseUnit,
    quoteBuyAmountCryptoPrecision,
    buyAsset,
    handleBack,
    innerStepsRendered,
    orderSubmissionState,
    sellAmountCryptoBaseUnit,
    sellAmountCryptoPrecision,
    sellAsset,
  ])

  const detail = useMemo(() => {
    switch (orderSubmissionState) {
      case LimitOrderSubmissionState.AwaitingAllowanceApproval:
        const allowanceApprovalNetworkFeeCryptoPrecision = fromBaseUnit(
          approvalNetworkFeeCryptoBaseUnit ?? '0',
          feeAsset?.precision ?? 0,
        )
        const allowanceApprovalNetworkFeeUserCurrency = bn(
          allowanceApprovalNetworkFeeCryptoPrecision,
        )
          .times(feeAssetRateUserCurrency)
          .toFixed()
        return (
          <Stack spacing={4} width='full'>
            <Row>
              <Row.Label>
                <Text translation='limitOrder.networkFee' />
              </Row.Label>
              <Row.Value>
                <Skeleton isLoaded={!isLoadingAllowanceApproval}>
                  <HStack justifyContent='flex-end'>
                    <Amount.Crypto
                      value={allowanceApprovalNetworkFeeCryptoPrecision}
                      symbol={feeAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color={'text.subtle'}
                      prefix='('
                      suffix=')'
                      noSpace
                      value={allowanceApprovalNetworkFeeUserCurrency}
                    />
                  </HStack>
                </Skeleton>
              </Row.Value>
            </Row>
          </Stack>
        )
      case LimitOrderSubmissionState.AwaitingAllowanceReset:
        const allowanceResetNetworkFeeCryptoPrecision = fromBaseUnit(
          allowanceResetNetworkFeeCryptoBaseUnit ?? '0',
          feeAsset?.precision ?? 0,
        )
        const allowanceResetNetworkFeeUserCurrency = bn(allowanceResetNetworkFeeCryptoPrecision)
          .times(feeAssetRateUserCurrency)
          .toFixed()
        return (
          <Stack spacing={4} width='full'>
            <Row>
              <Row.Label>
                <Text translation='limitOrder.networkFee' />
              </Row.Label>
              <Row.Value>
                <Skeleton isLoaded={!isLoadingAllowanceReset}>
                  <HStack justifyContent='flex-end'>
                    <Amount.Crypto
                      value={allowanceResetNetworkFeeCryptoPrecision}
                      symbol={feeAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color={'text.subtle'}
                      prefix='('
                      suffix=')'
                      noSpace
                      value={allowanceResetNetworkFeeUserCurrency}
                    />
                  </HStack>
                </Skeleton>
              </Row.Value>
            </Row>
          </Stack>
        )
      case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
        return <LimitOrderDetail />
      default:
        return null
    }
  }, [
    allowanceResetNetworkFeeCryptoBaseUnit,
    approvalNetworkFeeCryptoBaseUnit,
    feeAsset?.precision,
    feeAsset?.symbol,
    feeAssetRateUserCurrency,
    isLoadingAllowanceApproval,
    isLoadingAllowanceReset,
    orderSubmissionState,
  ])

  const buttonTranslation: string | [string, number | InterpolationOptions] | undefined =
    useMemo(() => {
      if (!isConnected || isDemoWallet) return 'common.connectWallet'
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
    }, [isConnected, isDemoWallet, orderSubmissionState, sellAsset?.symbol])

  const handleConfirm = useCallback(async () => {
    if (!isConnected || isDemoWallet) {
      walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }
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
        const result = await placeLimitOrder({ quoteId, wallet })

        // Exit if the request failed.
        if (
          (result as { error: unknown }).error ||
          !result ||
          !(result as { data: unknown }).data
        ) {
          setLimitOrderTxFailed(quoteId)
          return
        }

        setLimitOrderTxComplete(quoteId)

        // refetch the orders list for this account
        const accountId = activeQuote?.params.accountId
        queryClient.invalidateQueries({
          queryKey: ['getLimitOrdersForAccount', accountId],
          refetchType: 'all',
        })

        // Clear the completed quote from the cache
        dispatch(
          limitOrderApi.util.invalidateTags([
            {
              type: 'limitOrderQuote',
              id: quoteId,
            },
          ]),
        )

        // Track event in mixpanel
        const eventData = getMixpanelLimitOrderEventData({
          sellAsset,
          buyAsset,
          sellAmountCryptoPrecision,
          buyAmountCryptoPrecision: quoteBuyAmountCryptoPrecision,
        })
        if (mixpanel && eventData) {
          mixpanel.track(MixPanelEvent.LimitOrderPlaced, eventData)
        }
        break
      default:
        break
    }
  }, [
    activeQuote?.params.accountId,
    allowanceApprovalMutation,
    allowanceResetMutation,
    quoteBuyAmountCryptoPrecision,
    buyAsset,
    dispatch,
    isConnected,
    isDemoWallet,
    mixpanel,
    orderSubmissionState,
    placeLimitOrder,
    quoteId,
    sellAmountCryptoPrecision,
    sellAsset,
    setLimitOrderTxComplete,
    setLimitOrderTxFailed,
    wallet,
    walletDispatch,
  ])

  const button = useMemo(() => {
    if (!buttonTranslation) return null
    const isLoading = (() => {
      if (isLoadingSetIsApprovalInitiallyNeeded) return true

      switch (orderSubmissionState) {
        case LimitOrderSubmissionState.AwaitingAllowanceApproval:
          return (
            allowanceApprovalMutation.isPending ||
            allowanceApprovalMutation.isSuccess ||
            isLoadingAllowanceApproval
          )
        case LimitOrderSubmissionState.AwaitingAllowanceReset:
          return (
            allowanceResetMutation.isPending ||
            allowanceResetMutation.isSuccess ||
            isLoadingAllowanceReset
          )
        case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
          return isLoadingLimitOrderPlacement
        default:
          return false
      }
    })()
    return (
      <Button
        colorScheme={'blue'}
        size='lg'
        width='full'
        onClick={handleConfirm}
        isLoading={isLoading}
        isDisabled={!activeQuote}
      >
        <Text translation={buttonTranslation} />
      </Button>
    )
  }, [
    buttonTranslation,
    handleConfirm,
    activeQuote,
    isLoadingSetIsApprovalInitiallyNeeded,
    orderSubmissionState,
    allowanceApprovalMutation.isPending,
    allowanceApprovalMutation.isSuccess,
    isLoadingAllowanceApproval,
    allowanceResetMutation.isPending,
    allowanceResetMutation.isSuccess,
    isLoadingAllowanceReset,
    isLoadingLimitOrderPlacement,
  ])

  const footer = useMemo(() => {
    if (!detail && !button) return null
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
