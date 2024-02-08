import type { FlexProps } from '@chakra-ui/react'
import { Center, Stack } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import { AnimatePresence } from 'framer-motion'
import { type FC, memo, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { StreamIcon } from 'components/Icons/Stream'
import { Row } from 'components/Row/Row'
import { SlideTransitionX } from 'components/SlideTransitionX'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'

import { SwapperIcon } from './TradeInput/components/SwapperIcon/SwapperIcon'

type RateGasRowProps = {
  sellSymbol?: string
  buySymbol?: string
  rate?: string
  gasFee: string
  isLoading?: boolean
  isError?: boolean
  swapperName?: SwapperName
  swapSource?: SwapSource
}

const helpersTooltipFlexProps: FlexProps = { flexDirection: 'row-reverse' }

export const RateGasRow: FC<RateGasRowProps> = memo(
  ({ sellSymbol, buySymbol, rate, gasFee, isLoading, isError, swapperName, swapSource }) => {
    const translate = useTranslate()
    const swapperIcons = useMemo(() => {
      const isStreaming =
        swapSource === THORCHAIN_STREAM_SWAP_SOURCE ||
        swapSource === THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE
      return (
        <AnimatePresence>
          {isStreaming && (
            <SlideTransitionX>
              <Center
                className='quote-icon'
                bg='background.surface.raised.base'
                borderRadius='md'
                borderWidth={1}
                p='2px'
                borderColor='border.base'
                boxShadow='0 1px 2px rgba(0,0,0,.2)'
              >
                <StreamIcon color='text.success' />
              </Center>
            </SlideTransitionX>
          )}
          <Center
            className='quote-icon'
            bg='background.surface.raised.base'
            borderRadius='md'
            borderWidth={1}
            p='2px'
            borderColor='border.base'
            boxShadow='0 1px 2px rgba(0,0,0,.2)'
          >
            {swapperName && <SwapperIcon size='2xs' swapperName={swapperName} />}
          </Center>
        </AnimatePresence>
      )
    }, [swapSource, swapperName])
    switch (true) {
      case isLoading:
        return (
          <Stack direction='row' alignItems='center' fontSize='sm'>
            <CircularProgress size='16px' />
            <Text translation={'trade.searchingRate'} />
          </Stack>
        )
      case !rate || isError:
        return (
          <Stack direction='row' alignItems='center' fontSize='sm'>
            <HelperTooltip
              label={translate('trade.tooltip.noRateAvailable')}
              flexProps={helpersTooltipFlexProps}
            >
              <Text translation={'trade.noRateAvailable'} />
            </HelperTooltip>
          </Stack>
        )
      default:
        return (
          <Stack direction='row' fontWeight='medium'>
            <Row fontSize='sm' flex={1}>
              <Row.Value fontSize='sm' display='flex' alignItems='center' gap={2}>
                {swapperIcons}
                <Stack width='full' direction='row' spacing={1}>
                  <Amount.Crypto
                    fontSize='sm'
                    value='1'
                    symbol={sellSymbol ?? ''}
                    suffix={sellSymbol ? '=' : ''}
                  />
                  <Amount.Crypto
                    fontSize='sm'
                    value={firstNonZeroDecimal(bnOrZero(rate)) ?? ''}
                    symbol={buySymbol ?? ''}
                  />
                </Stack>
              </Row.Value>
            </Row>
            <Row justifyContent='flex-end' alignItems='center' width='auto' columnGap={2}>
              <Row.Label fontSize='sm'>
                <FaGasPump />
              </Row.Label>
              <Row.Value>
                <Amount.Fiat fontSize='sm' value={gasFee} />
              </Row.Value>
            </Row>
          </Stack>
        )
    }
  },
)
