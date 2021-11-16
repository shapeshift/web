import { Button, Divider, Flex, Image, Link, SkeletonCircle, useToast } from '@chakra-ui/react'
import { ChainTypes, SwapperType } from '@shapeshiftoss/types'
import { useEffect, useRef, useState } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router-dom'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useSwapper, TRADE_ERRORS } from 'components/Trade/hooks/useSwapper/useSwapper'
import { TradeState } from 'components/Trade/Trade'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { theme } from 'theme/theme'

type ApprovalParams = {
  fiatRate: string
}

const APPROVAL_PERMISSION_URL = 'https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'

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
    formState: { errors, isSubmitting }
  } = useFormContext<TradeState<ChainTypes, SwapperType>>()
  const { approveInfinite, checkApprovalNeeded, buildQuoteTx } = useSwapper()
  const {
    number: { toCrypto, toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet }
  } = useWallet()
  const { quote, sellAsset, fees } = getValues()
  const fee = fees?.chainSpecific?.approvalFee
  const symbol = sellAsset.currency?.symbol

  const approve = async () => {
    if (!wallet) return
    let txId
    try {
      txId = await approveInfinite(wallet)
    } catch (e) {
      console.error(`Approval:approve - ${e}`)
      // TODO: (ryankk) this toast is currently assuming that the error is 'Not enough eth for tx fee' because we don't
      // get the full error response back from unchained (we get a 500 error). We can make this more precise by returning
      // the full error returned from unchained.
      handleToast(translate(TRADE_ERRORS.NOT_ENOUGH_ETH))
    }

    if (!txId) return
    setApprovalTxId(txId)

    const interval = setInterval(async () => {
      try {
        const approvalNeeded = await checkApprovalNeeded(wallet)
        if (approvalNeeded) return
      } catch (e) {
        console.error(`Approval:approve:checkApprovalNeeded - ${e}`)
        handleToast()
        approvalInterval.current && clearInterval(approvalInterval.current)
        return history.push('/trade/input')
      }

      approvalInterval.current && clearInterval(approvalInterval.current)
      if (!sellAsset.amount) return
      if (!quote) return
      let result
      try {
        result = await buildQuoteTx({
          wallet,
          sellAsset: quote?.sellAsset,
          buyAsset: quote?.buyAsset,
          amount: sellAsset?.amount
        })
      } catch (e) {
        console.error(`Approval:approve:buildQuoteTx - ${e}`)
      }

      if (!result?.success && result?.statusReason) {
        handleToast(result.statusReason)
      }

      if (result?.success) {
        history.push({ pathname: '/trade/confirm', state: { fiatRate } })
      } else {
        history.push('/trade/input')
      }
    }, 5000)
    approvalInterval.current = interval
  }

  const handleToast = (description: string = '') => {
    toast({
      title: translate(TRADE_ERRORS.TITLE),
      description,
      status: 'error',
      duration: 9000,
      isClosable: true,
      position: 'top-right'
    })
  }

  useEffect(() => {
    // TODO: (ryankk) fix errors to reflect correct attribute
    const error = errors?.quote?.rate ?? null
    if (error) history.push('/trade/input')
  }, [errors, history])

  return (
    <SlideTransition>
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
            [theme.colors.blue[500], 0.4]
          ]}
          onComplete={() => {
            return [true, 0]
          }}
        >
          <Image
            src={sellAsset.currency?.icon}
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
          {approvalTxId && sellAsset.currency?.explorerTxLink && (
            <Row>
              <Row.Label>
                <Text translation={['trade.approvingAsset', { symbol }]} />
              </Row.Label>
              <Row.Value>
                <Link
                  isExternal
                  color='blue.500'
                  // TODO:(ryankk) create explorer links given a link template and a value
                  href={`${sellAsset.currency?.explorerTxLink}${approvalTxId}`}
                >
                  <MiddleEllipsis maxWidth='130px'>{approvalTxId}</MiddleEllipsis>
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
    </SlideTransition>
  )
}
