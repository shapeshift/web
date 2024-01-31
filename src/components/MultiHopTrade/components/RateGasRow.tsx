import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Center, Collapse, Divider, Flex, Stack, useDisclosure } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { PropsWithChildren } from 'react'
import { type FC, memo, useCallback } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'

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
} & PropsWithChildren

const helpersTooltipFlexProps: FlexProps = { flexDirection: 'row-reverse' }
const rowHover = { bg: 'background.surface.raised.base' }
const rateHover = {
  cursor: 'pointer',
  '.rate': { borderColor: 'text.link' },
}

export const RateGasRow: FC<RateGasRowProps> = memo(
  ({ sellSymbol, buySymbol, rate, gasFee, isLoading, isError, swapperName, children }) => {
    const translate = useTranslate()
    const history = useHistory()
    const { isOpen, onToggle } = useDisclosure()

    const handleRateClick = useCallback(() => {
      history.push(TradeRoutePaths.Quotes)
    }, [history])

    switch (true) {
      case isLoading:
        return (
          <Stack direction='row' alignItems='center' fontSize='sm' px={6} py={4}>
            <CircularProgress size='16px' />
            <Text translation={'trade.searchingRate'} />
          </Stack>
        )
      case !rate || isError:
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
          >
            <Flex
              alignItems='center'
              justifyContent='space-between'
              onClick={onToggle}
              cursor='pointer'
              px={6}
              py={4}
            >
              <Row fontSize='sm' flex={1}>
                <Row.Value
                  fontSize='sm'
                  display='flex'
                  alignItems='center'
                  gap={2}
                  _hover={rateHover}
                  onClick={handleRateClick}
                  zIndex={2}
                >
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
              <Flex gap={2} alignItems='center'>
                <Row justifyContent='flex-end' alignItems='center' width='auto' columnGap={2}>
                  <Row.Label fontSize='sm'>
                    <FaGasPump />
                  </Row.Label>
                  <Row.Value>
                    <Amount.Fiat fontSize='sm' value={gasFee} />
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
