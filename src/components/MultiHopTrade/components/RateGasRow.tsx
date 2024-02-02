import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Center, Collapse, Divider, Flex, Stack, Tooltip, useDisclosure } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import { AnimatePresence } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import { type FC, memo, useCallback, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
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

import { TradeRoutePaths } from '../types'
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
} & PropsWithChildren

const helpersTooltipFlexProps: FlexProps = { flexDirection: 'row-reverse' }
const rowHover = { bg: 'background.surface.raised.base' }
const rateHover = {
  cursor: 'pointer',
  '.rate': { borderColor: 'text.link' },
}

export const RateGasRow: FC<RateGasRowProps> = memo(
  ({
    sellSymbol,
    buySymbol,
    rate,
    gasFee,
    isLoading,
    isError,
    swapperName,
    swapSource,
    children,
  }) => {
    const translate = useTranslate()
    const history = useHistory()
    const { isOpen, onToggle } = useDisclosure()

    const handleRateClick = useCallback(() => {
      history.push(TradeRoutePaths.Quotes)
    }, [history])

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
          <Stack direction='row' alignItems='center' px={6} py={4} fontSize='sm'>
            <CircularProgress size='16px' />
            <Text translation={'trade.searchingRate'} />
          </Stack>
        )
      case (!rate && !isLoading) || isError:
        return (
          <Stack direction='row' alignItems='center' px={6} py={4} fontSize='sm'>
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
          <Stack
            fontWeight='medium'
            spacing={0}
            _hover={rowHover}
            bg={isOpen ? 'background.surface.raised.base' : 'transparent'}
            transitionProperty='common'
            transitionDuration='normal'
            fontSize='sm'
          >
            <Flex
              alignItems='center'
              justifyContent='space-between'
              onClick={onToggle}
              cursor='pointer'
              px={6}
              py={4}
            >
              <Tooltip hasArrow label={translate('trade.tooltip.changeQuote')} placement='right'>
                <Flex>
                  <Row flex={1}>
                    <Row.Value
                      display='flex'
                      alignItems='center'
                      gap={2}
                      _hover={rateHover}
                      onClick={handleRateClick}
                      zIndex={2}
                    >
                      {swapperIcons}

                      <Stack
                        width='full'
                        direction='row'
                        spacing={1}
                        color='text.link'
                        className='rate'
                        borderBottomWidth={1}
                        borderColor='transparent'
                      >
                        <Amount.Crypto
                          value='1'
                          symbol={sellSymbol ?? ''}
                          suffix={sellSymbol ? '=' : ''}
                        />
                        <Amount.Crypto
                          value={firstNonZeroDecimal(bnOrZero(rate)) ?? ''}
                          symbol={buySymbol ?? ''}
                        />
                      </Stack>
                    </Row.Value>
                  </Row>
                </Flex>
              </Tooltip>
              <Flex gap={2} alignItems='center'>
                <Row justifyContent='flex-end' alignItems='center' width='auto' columnGap={2}>
                  <Row.Label>
                    <FaGasPump />
                  </Row.Label>
                  <Row.Value>
                    <Amount.Fiat value={gasFee} />
                  </Row.Value>
                </Row>
                {isOpen ? (
                  <ChevronUpIcon color='text.subtle' />
                ) : (
                  <ChevronDownIcon color='text.subtle' />
                )}
              </Flex>
            </Flex>
            <Collapse in={isOpen}>
              <>
                <Divider borderColor='border.base' />
                {children}
              </>
            </Collapse>
          </Stack>
        )
    }
  },
)
