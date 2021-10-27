import { Button, Divider, Flex, Image, Link, SkeletonCircle } from '@chakra-ui/react'
import { get } from 'lodash'
import { useEffect, useRef, useState } from 'react'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { useHistory, useLocation } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from 'lib/bignumber/bignumber'
import { theme } from 'theme/theme'

type ApprovalParams = {
  ethFiatRate: string
}

export const Approval = () => {
  const history = useHistory()
  const location = useLocation()
  const approvalInterval: { current: NodeJS.Timeout | undefined } = useRef()
  const [approvalTxId, setApprovalTxId] = useState<string>()
  const { ethFiatRate } = location.state as ApprovalParams
  const {
    getValues,
    formState: { errors }
  } = useFormContext()
  const { approveInfinite, checkApprovalNeeded, buildQuoteTx } = useSwapper()
  const {
    number: { toCrypto, toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet }
  } = useWallet()
  const { quote, sellAsset, fees } = getValues()
  const fee = fees.chainSpecific.approvalFee
  const symbol = sellAsset.currency?.symbol

  const approve = async () => {
    if (wallet) {
      const txId = await approveInfinite(wallet)
      if (txId) {
        setApprovalTxId(txId)
        const interval = setInterval(async () => {
          const approvalNeeded = await checkApprovalNeeded(wallet)
          if (!approvalNeeded) {
            clearInterval(approvalInterval.current as NodeJS.Timeout)
            const result = await buildQuoteTx({
              wallet,
              sellAsset: { ...quote.sellAsset, amount: sellAsset.amount },
              buyAsset: { ...quote.buyAsset }
            })
            if (result?.success) {
              history.push({ pathname: '/trade/confirm', state: { ethFiatRate } })
            } else {
              history.push('/trade/input')
            }
          }
        }, 10000)
        approvalInterval.current = interval
      }
    }
  }

  useEffect(() => {
    const error = get(errors, `buildQuote.message`, null)
    if (error) history.push('/trade/input')
  }, [errors, history])

  return (
    <SlideTransition>
      <Flex justifyContent='center' alignItems='center' flexDirection='column'>
        <CountdownCircleTimer
          isPlaying={!!approvalTxId}
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
          translation={['trade.allowShapeshift', { symbol }]}
        />
        <Text color='gray.500' translation={['trade.needPermission', { symbol }]} />
        <Text color='blue.500' translation='trade.whyNeedThis' />
        <Divider my={4} />
        {!approvalTxId ? (
          <Flex flexDirection='column' width='full'>
            <Flex justifyContent='space-between' my={2}>
              <Text color='gray.500' translation='trade.estimatedGasFee' />
              <Flex flexDirection='column' alignItems='flex-end'>
                <RawText>{toFiat(bn(fee).times(ethFiatRate).toNumber())}</RawText>
                <RawText color='gray.500'>{toCrypto(Number(fee), 'ETH')}</RawText>
              </Flex>
            </Flex>
            <Button colorScheme='blue' mt={2} onClick={approve}>
              <Text translation='common.confirm' />
            </Button>
            <Button mt={2} onClick={() => history.goBack()}>
              <Text translation='common.reject' />
            </Button>
          </Flex>
        ) : (
          <>
            <Text fontWeight='bold' translation={['trade.approvingAsset', { symbol }]} />
            <Link
              isExternal
              color='blue.500'
              href={sellAsset.currency?.explorerTxLink + approvalTxId}
            >
              <Text translation='trade.viewTransaction' />
            </Link>
          </>
        )}
      </Flex>
    </SlideTransition>
  )
}
