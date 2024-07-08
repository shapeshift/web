import { ArrowUpDownIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import {
  Box,
  Center,
  Collapse,
  Flex,
  Skeleton,
  Stack,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import { AnimatePresence } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import { type FC, memo, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { StreamIcon } from 'components/Icons/Stream'
import { Row } from 'components/Row/Row'
import { SlideTransitionX } from 'components/SlideTransitionX'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'

import { SwapperIcon } from './TradeInput/components/SwapperIcon/SwapperIcon'

type RateGasRowProps = {
  sellSymbol?: string
  buySymbol?: string
  rate?: string
  gasFee: string
  isLoading?: boolean
  allowSelectQuote: boolean
  swapperName?: SwapperName
  swapSource?: SwapSource
  onRateClick?: () => void
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
    allowSelectQuote,
    swapperName,
    swapSource,
    onRateClick,
    children,
  }) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure()

    const swapperIcons = useMemo(() => {
      const isStreaming =
        swapSource === THORCHAIN_STREAM_SWAP_SOURCE ||
        swapSource === THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE
      return (
        <AnimatePresence>
          {isStreaming && (
            <SlideTransitionX key={swapSource ?? swapperName}>
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
          <Stack
            direction='row'
            alignItems='center'
            fontSize='sm'
            px={6}
            py={4}
            justifyContent='space-between'
          >
            <Text translation={'trade.searchingRate'} />
            <Skeleton height='21px' width='80px' />
          </Stack>
        )
      case !rate:
        return (
          <Stack direction='row' alignItems='center' fontSize='sm' px={6} py={4}>
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
            <Flex alignItems='center' justifyContent='space-between' px={6} py={4} width='full'>
              <Tooltip
                isDisabled={!allowSelectQuote}
                label={translate('trade.tooltip.changeQuote')}
              >
                <Box>
                  <Row fontSize='sm' flex={1}>
                    <Row.Value
                      fontSize='sm'
                      display='flex'
                      alignItems='center'
                      gap={2}
                      _hover={allowSelectQuote ? rateHover : undefined}
                      onClick={onRateClick}
                    >
                      {swapperIcons}
                      <Stack
                        width='full'
                        direction='row'
                        spacing={1}
                        color={allowSelectQuote ? 'text.link' : 'text.base'}
                        className='rate'
                        borderBottomWidth={1}
                        borderColor='transparent'
                        alignItems='center'
                      >
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
                        {allowSelectQuote && <ArrowUpDownIcon />}
                      </Stack>
                    </Row.Value>
                  </Row>
                </Box>
              </Tooltip>
              <Flex gap={1} alignItems='center' cursor='pointer' onClick={onToggle}>
                <Row justifyContent='flex-end' alignItems='center' width='auto' columnGap={2}>
                  <Row.Label fontSize='sm'>
                    <FaGasPump />
                  </Row.Label>
                  <Row.Value>
                    <Amount.Fiat fontSize='sm' value={gasFee} />
                  </Row.Value>
                </Row>
                {isOpen ? (
                  <ChevronUpIcon color='text.subtle' boxSize='1.25rem' />
                ) : (
                  <ChevronDownIcon color='text.subtle' boxSize='1.25rem' />
                )}
              </Flex>
            </Flex>
            {children && <Collapse in={isOpen}>{children}</Collapse>}
          </Stack>
        )
    }
  },
)
