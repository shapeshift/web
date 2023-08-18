import {
  Box,
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Heading,
  Image,
  Link,
  Skeleton,
  SkeletonCircle,
  Switch,
  Text as CText,
} from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useEffect, useMemo } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { useAllowanceApproval } from 'components/MultiHopTrade/hooks/useAllowanceApproval/useAllowanceApproval'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { baseUnitToHuman } from 'lib/bignumber/bignumber'
import type { SwapperName, TradeQuote2 } from 'lib/swapper/api'
import { selectUserCurrencyRateByAssetId } from 'state/slices/marketDataSlice/selectors'
import {
  selectActiveSwapperName,
  selectFirstHop,
  selectFirstHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'
import { theme } from 'theme/theme'

const APPROVAL_PERMISSION_URL = 'https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'

const ApprovalInner = ({
  swapperName,
  tradeQuoteStep,
}: {
  swapperName: SwapperName
  tradeQuoteStep: TradeQuote2['steps'][number]
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const { showErrorToast } = useErrorHandler()

  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext()
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const {
    state: { isConnected, wallet },
    dispatch,
  } = useWallet()

  const symbol = useMemo(() => tradeQuoteStep.sellAsset.symbol, [tradeQuoteStep.sellAsset.symbol])

  const approveAssetLabel: [string, number | InterpolationOptions] = useMemo(
    () => ['trade.approveAsset', { symbol }],
    [symbol],
  )
  const approvingAssetLabel: [string, number | InterpolationOptions] = useMemo(
    () => ['trade.approvingAsset', { symbol }],
    [symbol],
  )

  const sellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const sellFeeAssetUserCurrencyRate = useAppSelector(state =>
    sellFeeAsset ? selectUserCurrencyRateByAssetId(state, sellFeeAsset.assetId) : undefined,
  )

  const {
    isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalNetworkFeeCryptoBaseUnit,
    isLoading: isAllowanceApprovalHookLoading,
  } = useAllowanceApproval(tradeQuoteStep, isExactAllowance)

  const approvalNetworkFeeCryptoHuman = useMemo(() => {
    if (!approvalNetworkFeeCryptoBaseUnit || !sellFeeAsset) return
    return baseUnitToHuman({
      value: approvalNetworkFeeCryptoBaseUnit,
      inputExponent: sellFeeAsset.precision,
    })
  }, [approvalNetworkFeeCryptoBaseUnit, sellFeeAsset])

  const approvalNetworkFeeCryptoHumanDisplay = useMemo(() => {
    return approvalNetworkFeeCryptoHuman && !approvalNetworkFeeCryptoHuman.isZero()
      ? toCrypto(approvalNetworkFeeCryptoHuman.toNumber(), sellFeeAsset?.symbol)
      : ''
  }, [approvalNetworkFeeCryptoHuman, sellFeeAsset?.symbol, toCrypto])

  const approvalNetworkFeeFiatDisplay = useMemo(() => {
    const rate = bnOrZero(sellFeeAssetUserCurrencyRate)
    return approvalNetworkFeeCryptoHuman && !rate.isZero()
      ? toFiat(approvalNetworkFeeCryptoHuman.times(rate).toString())
      : ''
  }, [approvalNetworkFeeCryptoHuman, sellFeeAssetUserCurrencyRate, toFiat])

  const isInitializing = useMemo(
    () => !wallet || isAllowanceApprovalHookLoading,
    [isAllowanceApprovalHookLoading, wallet],
  )

  const isLoading = useMemo(() => {
    return isInitializing || isSubmitting || !!approvalTxId || !approvalNetworkFeeCryptoHuman
  }, [approvalNetworkFeeCryptoHuman, approvalTxId, isInitializing, isSubmitting])

  const approveContract = useCallback(async () => {
    if (isInitializing) {
      return
    }

    try {
      if (!isConnected) {
        // call history.goBack() to reset current form state
        // before opening the connect wallet modal.
        history.goBack()
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      await executeAllowanceApproval()
    } catch (e) {
      showErrorToast(e)
    }
  }, [isInitializing, isConnected, executeAllowanceApproval, history, dispatch, showErrorToast])

  // proceed to trade confirmation when approval is no longer needed
  // this is managed async to approveContract so that approvals done external to this app propagate
  useEffect(() => {
    // Wait for the form submit to be false before pushing the confirm route
    if (isSubmitting) return
    // explicitly check for false as undefined indicates an unknown state
    if (isApprovalNeeded === false) {
      history.push({ pathname: TradeRoutePaths.Confirm })
    }
  }, [history, isApprovalNeeded, isSubmitting])

  const handleComplete = useCallback(() => ({ shouldRepeat: true }), [])

  const renderImage = useCallback(() => {
    return (
      <Image
        src={tradeQuoteStep.sellAsset.icon}
        boxSize='60px'
        fallback={<SkeletonCircle boxSize='60px' />}
      />
    )
  }, [tradeQuoteStep.sellAsset.icon])

  const handleBack = useCallback(() => history.goBack(), [history])

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(approveContract)}>
        <CardHeader textAlign='center'>
          <Heading as='h5'>
            <Text translation='assets.assetCards.assetActions.trade' />
          </Heading>
        </CardHeader>
        <CardBody>
          <Flex justifyContent='center' alignItems='center' flexDirection='column' width='full'>
            <CountdownCircleTimer
              isPlaying={!!approvalTxId || isSubmitting}
              size={90}
              strokeWidth={6}
              trailColor={theme.colors.whiteAlpha[500]}
              duration={60}
              colors={theme.colors.blue[500]}
              onComplete={handleComplete}
            >
              {renderImage}
            </CountdownCircleTimer>
            <Text
              my={2}
              fontSize='lg'
              fontWeight='bold'
              textAlign='center'
              translation={approveAssetLabel}
            />
            <CText color='text.subtle' textAlign='center'>
              <Link
                href={`${tradeQuoteStep.sellAsset.explorerAddressLink}${tradeQuoteStep.allowanceContract}`}
                color='blue.500'
                me={1}
                isExternal
              >
                {swapperName}
              </Link>
              {translate('trade.needPermission', { symbol })}
            </CText>
            <Link isExternal color='blue.500' href={APPROVAL_PERMISSION_URL}>
              <Text color='blue.500' translation='trade.whyNeedThis' />
            </Link>
            <Flex flexDirection='column' width='full'>
              {approvalTxId && tradeQuoteStep.sellAsset.explorerTxLink && (
                <Row>
                  <Row.Label>
                    <Text translation={approvingAssetLabel} />
                  </Row.Label>
                  <Row.Value>
                    <Link
                      isExternal
                      color='blue.500'
                      href={`${tradeQuoteStep.sellAsset.explorerTxLink}${approvalTxId}`}
                    >
                      <MiddleEllipsis value={approvalTxId} />
                    </Link>
                  </Row.Value>
                </Row>
              )}
            </Flex>
          </Flex>
        </CardBody>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <Row>
            <Row.Label display='flex' alignItems='center'>
              <HelperTooltip label={translate('trade.allowanceTooltip')}>
                <Text color='text.subtle' translation='trade.allowance' />
              </HelperTooltip>
            </Row.Label>
            <Row.Value textAlign='right' display='flex' alignItems='center'>
              <Text
                color={isExactAllowance ? 'text.subtle' : 'white'}
                translation='trade.unlimited'
                fontWeight='bold'
              />
              <Switch
                size='sm'
                mx={2}
                isChecked={isExactAllowance}
                onChange={toggleIsExactAllowance}
              />
              <Text
                color={isExactAllowance ? 'white' : 'text.subtle'}
                translation='trade.exact'
                fontWeight='bold'
              />
            </Row.Value>
          </Row>
          <Flex flexDir='column' gap={2} mx={-2}>
            <Button type='submit' size='lg' isLoading={isLoading} colorScheme='blue' mt={2}>
              <Text translation='common.confirm' />
            </Button>
            {!approvalTxId && !isSubmitting && (
              <Button mt={2} size='lg' onClick={handleBack}>
                <Text translation='common.reject' />
              </Button>
            )}
          </Flex>
          <Row>
            <Row.Label>
              <Text color='text.subtle' translation='trade.estimatedGasFee' />
            </Row.Label>
            <Row.Value textAlign='right'>
              <Skeleton isLoaded={approvalNetworkFeeCryptoHuman !== undefined}>
                <RawText>{approvalNetworkFeeFiatDisplay}</RawText>
                <RawText color='text.subtle'>{approvalNetworkFeeCryptoHumanDisplay}</RawText>
              </Skeleton>
            </Row.Value>
          </Row>
        </CardFooter>
      </Box>
    </SlideTransition>
  )
}

export const Approval = () => {
  const history = useHistory()
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const swapperName = useAppSelector(selectActiveSwapperName)

  if (!tradeQuoteStep || !swapperName) {
    history.goBack()
    return null
  }

  return <ApprovalInner tradeQuoteStep={tradeQuoteStep} swapperName={swapperName} />
}
