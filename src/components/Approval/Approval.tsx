import { Button, Divider, Flex, Image, Link, SkeletonCircle, useToast } from '@chakra-ui/react'
import { SupportedChainIds } from '@shapeshiftoss/types'
import { useEffect, useRef, useState } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TRADE_ERRORS, useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { TradeRoutePaths, TradeState } from 'components/Trade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { theme } from 'theme/theme'

type ApprovalParams = {
  fiatRate: string
}

const APPROVAL_PERMISSION_URL = 'https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'

const moduleLogger = logger.child({ namespace: ['Approval'] })

export const Approval = () => {
  const history = useHistory()
  const location = useLocation<ApprovalParams>()
  const approvalInterval: { current: NodeJS.Timeout | undefined } = useRef()
  const toast = useToast()
  const translate = useTranslate()
  const [approvalTxId, setApprovalTxId] = useState<string>()
  const { fiatRate } = location.state

  const {
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useFormContext<TradeState<SupportedChainIds>>()
  const { approveInfinite, checkApprovalNeeded } = useSwapper()
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet, isConnected },
    dispatch,
  } = useWallet()
  const { quote, fees } = getValues()
  const fee = fees?.chainSpecific?.approvalFee
  const symbol = quote?.sellAsset?.symbol

  const approve = async () => {
    if (!wallet) return
    if (!isConnected) {
      /**
       * call history.goBack() to reset current form state
       * before opening the connect wallet modal.
       */
      history.goBack()
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }
    const fnLogger = logger.child({ name: 'approve' })
    fnLogger.trace('Attempting Approval...')

    let txId
    try {
      txId = await approveInfinite(wallet)
    } catch (e) {
      fnLogger.error(e, 'Approval Failed')
      // TODO: (ryankk) this toast is currently assuming that the error is 'Not enough eth for tx fee' because we don't
      // get the full error response back from unchained (we get a 500 error). We can make this more precise by returning
      // the full error returned from unchained.
      handleToast(translate(TRADE_ERRORS.NOT_ENOUGH_ETH))
    }

    if (!txId) return
    setApprovalTxId(txId)

    approvalInterval.current = setInterval(async () => {
      fnLogger.trace({ fn: 'checkApprovalNeeded' }, 'Checking Approval Needed...')
      try {
        const approvalNeeded = await checkApprovalNeeded(wallet)
        if (approvalNeeded) return
      } catch (e) {
        fnLogger.error(e, { fn: 'checkApprovalNeeded' }, 'Check Approval Needed Failed')
        handleToast()
        approvalInterval.current && clearInterval(approvalInterval.current)
        return history.push(TradeRoutePaths.Input)
      }
      approvalInterval.current && clearInterval(approvalInterval.current)
      history.push({ pathname: TradeRoutePaths.Confirm, state: { fiatRate } })
    }, 5000)
  }

  const handleToast = (description: string = '') => {
    toast({
      title: translate(TRADE_ERRORS.TITLE),
      description,
      status: 'error',
      duration: 9000,
      isClosable: true,
      position: 'top-right',
    })
  }

  useEffect(() => {
    // TODO: (ryankk) fix errors to reflect correct attribute
    const error = errors?.quote?.rate ?? null
    if (error) {
      moduleLogger.debug({ fn: 'validation', errors }, 'Form Validation Failed')
      history.push(TradeRoutePaths.Input)
    }
  }, [errors, history])

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
            onSubmit={handleSubmit(approve)}
          >
            <CountdownCircleTimer
              isPlaying={!!approvalTxId || !!isSubmitting}
              size={90}
              strokeWidth={6}
              trailColor={theme.colors.whiteAlpha[500]}
              duration={60}
              colors={[
                [theme.colors.blue[500], 0.4],
                [theme.colors.blue[500], 0.4],
              ]}
              onComplete={() => {
                return [true, 0]
              }}
            >
              <Image
                src={quote?.sellAsset?.icon}
                boxSize='60px'
                fallback={<SkeletonCircle boxSize='60px' />}
              />
            </CountdownCircleTimer>
            <Text
              my={2}
              fontSize='lg'
              fontWeight='bold'
              textAlign='center'
              translation={['trade.approveAsset', { symbol }]}
            />
            <Text
              color='gray.500'
              textAlign='center'
              translation={['trade.needPermission', { symbol }]}
            />
            <Link isExternal color='blue.500' href={APPROVAL_PERMISSION_URL}>
              <Text color='blue.500' translation='trade.whyNeedThis' />
            </Link>
            <Divider my={4} />
            <Flex flexDirection='column' width='full'>
              {approvalTxId && quote?.sellAsset?.explorerTxLink && (
                <Row>
                  <Row.Label>
                    <Text translation={['trade.approvingAsset', { symbol }]} />
                  </Row.Label>
                  <Row.Value>
                    <Link
                      isExternal
                      color='blue.500'
                      href={`${quote?.sellAsset?.explorerTxLink}${approvalTxId}`}
                    >
                      <MiddleEllipsis address={approvalTxId} />
                    </Link>
                  </Row.Value>
                </Row>
              )}
              <Row>
                <Row.Label>
                  <Text color='gray.500' translation='trade.estimatedGasFee' />
                </Row.Label>
                <Row.Value textAlign='right'>
                  <RawText>{toFiat(bnOrZero(fee).times(fiatRate).toNumber())}</RawText>
                  <RawText color='gray.500'>{toCrypto(Number(fee), 'ETH')}</RawText>
                </Row.Value>
              </Row>
              <Button
                type='submit'
                size='lg'
                isLoading={isSubmitting || !!approvalTxId}
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
            </Flex>
          </Flex>
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
