import { Button, Divider, Flex, Image, SkeletonCircle } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { useFormContext } from 'react-hook-form'
import { useHistory, useLocation } from 'react-router-dom'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { theme } from 'theme/theme'

type ApprovalParams = {
  sellAsset: Asset
  fee: string
  feeFiat: string
}

export const Approval = () => {
  const history = useHistory()
  const location = useLocation()
  const { sellAsset, fee, feeFiat } = location.state as ApprovalParams
  const { getValues } = useFormContext()
  const { approveInfinite } = useSwapper()
  const {
    number: { toCrypto, toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet }
  } = useWallet()
  const quote = getValues('quote')

  return (
    <SlideTransition>
      <Flex justifyContent='center' alignItems='center' flexDirection='column'>
        <CountdownCircleTimer
          isPlaying={true}
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
            src={sellAsset?.icon}
            boxSize='60px'
            fallback={<SkeletonCircle boxSize='60px' />}
          />
        </CountdownCircleTimer>
        <Text
          my={2}
          fontSize='lg'
          fontWeight='bold'
          textAlign='center'
          translation={['trade.allowShapeshift', { symbol: sellAsset?.symbol }]}
        />
        <Text
          color='gray.500'
          translation={['trade.needPermission', { symbol: sellAsset?.symbol }]}
        />
        <Text color='blue.500' translation='trade.whyNeedThis' />
        <Divider my={4} />
        <Flex flexDirection='column' width='full'>
          <Flex justifyContent='space-between' my={2}>
            <Text color='gray.500' translation='trade.estimatedGasFee' />
            <Flex flexDirection='column' alignItems='flex-end'>
              <RawText>{toFiat(feeFiat)}</RawText>
              <RawText color='gray.500'>{toCrypto(Number(fee), 'ETH')}</RawText>
            </Flex>
          </Flex>
          <Button
            colorScheme='blue'
            mt={2}
            onClick={() => wallet && approveInfinite(quote, wallet)}
          >
            <Text translation='common.confirm' />
          </Button>
          <Button mt={2} onClick={() => history.goBack()}>
            <Text translation='common.reject' />
          </Button>
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
