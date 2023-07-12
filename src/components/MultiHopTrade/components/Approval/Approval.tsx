import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Image,
  Link,
  Skeleton,
  SkeletonCircle,
  Switch,
  Text as CText,
  Tooltip,
} from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useCallback, useEffect, useMemo } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { useAllowanceApproval } from 'components/MultiHopTrade/hooks/useAllowanceApproval/useAllowanceApproval'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TradeRoutePaths } from 'components/Trade/types'
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
    // explicitly check for false as undefined indicates an unknown state
    if (isApprovalNeeded === false) {
      history.push({ pathname: TradeRoutePaths.Confirm })
    }
  }, [history, isApprovalNeeded])

  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header textAlign='center' px={0} pt={0}>
          <Card.Heading>
            <Text translation='assets.assetCards.assetActions.trade' />
          </Card.Heading>
        </Card.Header>
        <Card.Body pb={0} px={0}>
          <Flex
            justifyContent='center'
            alignItems='center'
            flexDirection='column'
            width='full'
            as='form'
            onSubmit={handleSubmit(approveContract)}
          >
            <CountdownCircleTimer
              isPlaying={!!approvalTxId || isSubmitting}
              size={90}
              strokeWidth={6}
              trailColor={theme.colors.whiteAlpha[500]}
              duration={60}
              colors={theme.colors.blue[500]}
              onComplete={() => ({ shouldRepeat: true })}
            >
              {() => (
                <Image
                  src={tradeQuoteStep.sellAsset.icon}
                  boxSize='60px'
                  fallback={<SkeletonCircle boxSize='60px' />}
                />
              )}
            </CountdownCircleTimer>
            <Text
              my={2}
              fontSize='lg'
              fontWeight='bold'
              textAlign='center'
              translation={['trade.approveAsset', { symbol }]}
            />
            <CText color='gray.500' textAlign='center'>
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
            <Divider my={4} />
            <Flex flexDirection='column' width='full'>
              {approvalTxId && tradeQuoteStep.sellAsset.explorerTxLink && (
                <Row>
                  <Row.Label>
                    <Text translation={['trade.approvingAsset', { symbol }]} />
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
              <Row>
                <Row.Label display='flex' alignItems='center'>
                  <Text color='gray.500' translation='trade.allowance' />
                  <Tooltip label={translate('trade.allowanceTooltip')}>
                    <Box ml={1}>
                      <Icon as={FaInfoCircle} color='gray.500' fontSize='0.7em' />
                    </Box>
                  </Tooltip>
                </Row.Label>
                <Row.Value textAlign='right' display='flex' alignItems='center'>
                  <Text
                    color={isExactAllowance ? 'gray.500' : 'white'}
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
                    color={isExactAllowance ? 'white' : 'gray.500'}
                    translation='trade.exact'
                    fontWeight='bold'
                  />
                </Row.Value>
              </Row>
              <Button type='submit' size='lg' isLoading={isLoading} colorScheme='blue' mt={2}>
                <Text translation='common.confirm' />
              </Button>
              {!approvalTxId && !isSubmitting && (
                <Button variant='ghost' mt={2} size='lg' onClick={() => history.goBack()}>
                  <Text translation='common.reject' />
                </Button>
              )}
              <Divider my={4} />
              <Row>
                <Row.Label>
                  <Text color='gray.500' translation='trade.estimatedGasFee' />
                </Row.Label>
                <Row.Value textAlign='right'>
                  <Skeleton isLoaded={approvalNetworkFeeCryptoHuman !== undefined}>
                    <RawText>{approvalNetworkFeeFiatDisplay}</RawText>
                    <RawText color='gray.500'>{approvalNetworkFeeCryptoHumanDisplay}</RawText>
                  </Skeleton>
                </Row.Value>
              </Row>
            </Flex>
          </Flex>
        </Card.Body>
      </Card>
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
