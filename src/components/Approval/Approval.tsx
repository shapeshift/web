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
import { ethAssetId } from '@shapeshiftoss/caip'
import type { evm, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import type { DisplayFeeData } from 'components/Trade/types'
import { TradeRoutePaths } from 'components/Trade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { baseUnitToHuman } from 'lib/bignumber/bignumber'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { selectFeeAssetFiatRate } from 'state/zustand/swapperStore/amountSelectors'
import { selectFees, selectQuote } from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'
import { theme } from 'theme/theme'

const APPROVAL_PERMISSION_URL = 'https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'

export const Approval = () => {
  const history = useHistory()
  const approvalInterval: { current: NodeJS.Timeout | undefined } = useRef()
  const [approvalTxId, setApprovalTxId] = useState<string>()
  const [approvalTxData, setApprovalTxData] = useState<{
    networkFeeCryptoBaseUnit: string
    buildCustomTxInput: evm.BuildCustomTxInput
  }>()
  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)
  const translate = useTranslate()
  const wallet = useWallet().state.wallet

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext()

  const activeQuote = useSwapperStore(selectQuote)
  const feeAssetFiatRate = useSwapperStore(selectFeeAssetFiatRate)
  const fees = useSwapperStore(selectFees) as DisplayFeeData<EvmChainId> | undefined
  const updateTrade = useSwapperStore(state => state.updateTrade)

  const { approve, checkApprovalNeeded, getApprovalTxData, getTrade } = useSwapper()
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const { showErrorToast } = useErrorHandler()

  const symbol = activeQuote?.steps[0].sellAsset?.symbol

  const sellFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, activeQuote?.steps[0].sellAsset.assetId ?? ethAssetId),
  )

  const approveContract = useCallback(async () => {
    if (!activeQuote || !wallet || !approvalTxData) {
      return
    }

    try {
      if (!isConnected) {
        /**
         * call history.goBack() to reset current form state
         * before opening the connect wallet modal.
         */
        history.goBack()
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      const txId = await approve(approvalTxData.buildCustomTxInput)

      setApprovalTxId(txId)

      approvalInterval.current = setInterval(async () => {
        try {
          const approvalNeeded = await checkApprovalNeeded()
          if (approvalNeeded) return
        } catch (e) {
          showErrorToast(e)
          approvalInterval.current && clearInterval(approvalInterval.current)
          return history.push(TradeRoutePaths.Input)
        }
        approvalInterval.current && clearInterval(approvalInterval.current)

        const trade = await getTrade()
        if (trade.isErr()) {
          // Actually throw so we can catch the error and show the error toast
          throw new Error(trade.unwrapErr().message)
        }
        updateTrade(trade.unwrap())
        history.push({ pathname: TradeRoutePaths.Confirm })
      }, 5000)
    } catch (e) {
      showErrorToast(e)
    }
  }, [
    activeQuote,
    wallet,
    approvalTxData,
    isConnected,
    approve,
    history,
    dispatch,
    getTrade,
    updateTrade,
    checkApprovalNeeded,
    showErrorToast,
  ])

  useEffect(() => {
    setApprovalTxData(undefined)
    ;(async () => {
      try {
        const approvalTxData = await getApprovalTxData(isExactAllowance)
        setApprovalTxData(approvalTxData)
      } catch (e) {
        showErrorToast(e)
        history.push(TradeRoutePaths.Input)
      }
    })()
  }, [isExactAllowance, getApprovalTxData, history, showErrorToast])

  const approvalNetworkFeeCryptoHuman = useMemo(() => {
    if (!approvalTxData || sellFeeAsset === undefined) return
    return baseUnitToHuman({
      value: approvalTxData.networkFeeCryptoBaseUnit,
      inputExponent: sellFeeAsset.precision,
    })
  }, [approvalTxData, sellFeeAsset])

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
                  src={activeQuote?.steps[0].sellAsset.icon}
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
                href={`${activeQuote?.steps[0].sellAsset.explorerAddressLink}${activeQuote?.steps[0].allowanceContract}`}
                color='blue.500'
                me={1}
                isExternal
              >
                {fees?.tradeFeeSource}
              </Link>
              {translate('trade.needPermission', { symbol })}
            </CText>
            <Link isExternal color='blue.500' href={APPROVAL_PERMISSION_URL}>
              <Text color='blue.500' translation='trade.whyNeedThis' />
            </Link>
            <Divider my={4} />
            <Flex flexDirection='column' width='full'>
              {approvalTxId && activeQuote?.steps[0].sellAsset.explorerTxLink && (
                <Row>
                  <Row.Label>
                    <Text translation={['trade.approvingAsset', { symbol }]} />
                  </Row.Label>
                  <Row.Value>
                    <Link
                      isExternal
                      color='blue.500'
                      href={`${activeQuote?.steps[0].sellAsset.explorerTxLink}${approvalTxId}`}
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
              <Button
                type='submit'
                size='lg'
                isLoading={isSubmitting || !!approvalTxId || !approvalNetworkFeeCryptoHuman}
                colorScheme='blue'
                mt={2}
              >
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
                    <RawText>
                      {approvalNetworkFeeCryptoHuman && !bnOrZero(feeAssetFiatRate).isZero()
                        ? toFiat(approvalNetworkFeeCryptoHuman.times(feeAssetFiatRate).toString())
                        : ''}
                    </RawText>
                    <RawText color='gray.500'>
                      {approvalNetworkFeeCryptoHuman && !approvalNetworkFeeCryptoHuman.isZero()
                        ? toCrypto(approvalNetworkFeeCryptoHuman.toNumber(), sellFeeAsset?.symbol)
                        : ''}
                    </RawText>
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
