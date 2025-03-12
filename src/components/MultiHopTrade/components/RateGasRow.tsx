import { ArrowUpDownIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { Box, Collapse, Flex, Skeleton, Stack, Tooltip, useDisclosure } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { FC, PropsWithChildren } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { SwapperIcons } from './SwapperIcons'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { Text } from '@/components/Text'
import { useToggle } from '@/hooks/useToggle/useToggle'

type RateGasRowProps = {
  buyAssetSymbol: string
  isDisabled?: boolean
  isLoading?: boolean
  rate: string | undefined
  sellAssetSymbol: string
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  networkFeeFiatUserCurrency: string | undefined
  onClick?: () => void
} & PropsWithChildren

const helpersTooltipFlexProps: FlexProps = { flexDirection: 'row-reverse' }
const rowHover = { bg: 'background.surface.raised.base' }
const rateHover = {
  cursor: 'pointer',
  '.rate': { borderColor: 'text.link' },
  userSelect: 'none',
}

export const RateGasRow: FC<RateGasRowProps> = memo(
  ({
    buyAssetSymbol,
    children,
    isDisabled,
    isLoading,
    rate,
    sellAssetSymbol,
    swapperName,
    swapSource,
    networkFeeFiatUserCurrency,
    onClick,
  }) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure()
    const [useInverse, toggleUseInverse] = useToggle(false)

    // Compute the inverse rate for toggling between display formats:
    const inverseRate = useMemo(() => {
      const parsedRate = bnOrZero(rate)
      if (parsedRate.isZero() || parsedRate.isNegative()) return '0'
      return bnOrZero(1).div(parsedRate).toFixed(8)
    }, [rate])

    const handleClick = useCallback(() => {
      toggleUseInverse()
      onClick && onClick()
    }, [toggleUseInverse, onClick])

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
              <Tooltip isDisabled={isDisabled} label={translate('trade.tooltip.changeQuote')}>
                <Box>
                  <Row fontSize='sm' flex={1}>
                    <Row.Value
                      fontSize='sm'
                      display='flex'
                      alignItems='center'
                      gap={2}
                      _hover={rateHover}
                      onClick={handleClick}
                    >
                      <SwapperIcons swapperName={swapperName} swapSource={swapSource} />
                      <Stack
                        width='full'
                        direction='row'
                        spacing={1}
                        color={!isDisabled ? 'text.link' : 'text.base'}
                        className='rate'
                        borderBottomWidth={1}
                        borderColor='transparent'
                        alignItems='center'
                      >
                        {!useInverse ? (
                          <>
                            <Amount.Crypto
                              fontSize='sm'
                              value='1'
                              symbol={sellAssetSymbol}
                              suffix='='
                            />
                            <Amount.Crypto fontSize='sm' value={rate} symbol={buyAssetSymbol} />
                          </>
                        ) : (
                          <>
                            <Amount.Crypto
                              fontSize='sm'
                              value='1'
                              symbol={buyAssetSymbol}
                              suffix='='
                            />
                            <Amount.Crypto
                              fontSize='sm'
                              value={inverseRate}
                              symbol={sellAssetSymbol}
                            />
                          </>
                        )}
                        {!isDisabled && <ArrowUpDownIcon />}
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
                    {!networkFeeFiatUserCurrency ? (
                      <Tooltip label={translate('trade.tooltip.continueSwapping')}>
                        <Text translation={'trade.unknownGas'} fontSize='sm' />
                      </Tooltip>
                    ) : (
                      <Amount.Fiat fontSize='sm' value={networkFeeFiatUserCurrency} />
                    )}
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
