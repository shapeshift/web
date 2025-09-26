import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from '@chakra-ui/icons'
import type { FlexProps, StackProps } from '@chakra-ui/react'
import { Box, Collapse, Flex, Skeleton, Stack, Tooltip, useDisclosure } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import type { FC, PropsWithChildren } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { clickableLinkSx } from '@/theme/styles'

type RateGasRowProps = {
  affiliateBps: string
  buyAssetSymbol: AssetId
  isLoading?: boolean
  rate: string | undefined
  sellAssetSymbol: AssetId
  icon: React.ReactNode
  networkFeeFiatUserCurrency: string | undefined
  deltaPercentage?: string | null
  invertRate?: boolean
  noExpand?: boolean
  isOpen?: boolean
  sx?: StackProps['sx']
} & PropsWithChildren

const helpersTooltipFlexProps: FlexProps = { flexDirection: 'row-reverse' }
const rowHover = {
  bg: {
    base: 'transparent',
    md: 'background.surface.raised.base',
  },
}

export const RateGasRow: FC<RateGasRowProps> = memo(
  ({
    affiliateBps,
    buyAssetSymbol,
    children,
    isLoading,
    rate,
    sellAssetSymbol,
    icon,
    networkFeeFiatUserCurrency,
    deltaPercentage,
    noExpand,
    invertRate,
    sx,
  }) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure()
    const [shouldInvertRate, setShouldInvertRate] = useState(Boolean(invertRate))
    const [hasClickedRate, setHasClickedRate] = useState(false)

    const feeMessage = useMemo(() => {
      const feePercentage = bnOrZero(affiliateBps).div(100).toString()
      return translate('trade.feeExplainer', {
        feePercentage,
      })
    }, [affiliateBps, translate])

    const feePopoverContent = useMemo(() => {
      return (
        <Stack spacing={2}>
          <Text color='text.subtle' translation={feeMessage} />
        </Stack>
      )
    }, [feeMessage])

    useEffect(() => {
      if (!hasClickedRate) {
        setShouldInvertRate(Boolean(invertRate))
      }
    }, [invertRate, hasClickedRate, setShouldInvertRate])

    const handleRateClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation()
      setHasClickedRate(true)
      setShouldInvertRate(prev => !prev)
    }, [])

    const deltaPercentageFormatted = useMemo(() => {
      if (!deltaPercentage) return null
      const deltaPercentageDecimals = bnOrZero(deltaPercentage).toFixed(2)
      if (bnOrZero(deltaPercentageDecimals).isZero()) return null

      return (
        <RawText color={bnOrZero(deltaPercentageDecimals).gt(0) ? 'green.500' : 'red.500'} ml={1}>
          {` (${bnOrZero(deltaPercentageDecimals).gt(0) ? '+' : ''}${deltaPercentageDecimals}%)`}
        </RawText>
      )
    }, [deltaPercentage])

    const rateContent = useMemo(() => {
      if (!(rate && buyAssetSymbol && sellAssetSymbol)) return null

      const prefix = shouldInvertRate ? `1 ${buyAssetSymbol} =` : `1 ${sellAssetSymbol} =`
      const value = shouldInvertRate ? bn(1).div(rate).toString() : rate
      const symbol = shouldInvertRate ? sellAssetSymbol : buyAssetSymbol

      return (
        <Flex>
          <Amount.Crypto
            color='text.subtle'
            fontWeight='medium'
            onClick={handleRateClick}
            sx={clickableLinkSx}
            cursor='pointer'
            userSelect='none'
            prefix={prefix}
            value={value}
            symbol={symbol}
          />
          {deltaPercentageFormatted}
        </Flex>
      )
    }, [
      rate,
      buyAssetSymbol,
      sellAssetSymbol,
      shouldInvertRate,
      handleRateClick,
      deltaPercentageFormatted,
    ])

    const dropdownBg = useMemo(() => {
      return isOpen ? { base: 'transparent', md: 'background.surface.raised.base' } : 'transparent'
    }, [isOpen])

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
            bg={dropdownBg}
            transitionProperty='common'
            transitionDuration='normal'
            fontSize='sm'
            sx={sx}
          >
            <Flex
              _hover={noExpand ? undefined : rowHover}
              onClick={noExpand ? undefined : onToggle}
              cursor={noExpand ? 'default' : 'pointer'}
              alignItems='center'
              justifyContent='space-between'
              px={4}
              py={4}
              width='full'
            >
              <Row fontSize='sm' flex={1} maxW='65%'>
                <Row.Value fontSize='sm' display='flex' alignItems='center' gap={2}>
                  <Stack
                    width='full'
                    direction='row'
                    className='rate'
                    borderColor='transparent'
                    alignItems='center'
                  >
                    {icon}
                    {rateContent}
                    <TooltipWithTouch label={feePopoverContent} placement='top'>
                      <InfoIcon color='text.subtle' boxSize='0.75rem' cursor='pointer' />
                    </TooltipWithTouch>
                  </Stack>
                </Row.Value>
              </Row>
              <Flex gap={1} alignItems='center'>
                <Tooltip
                  label={translate(
                    networkFeeFiatUserCurrency
                      ? 'trade.quote.gas'
                      : 'trade.tooltip.continueSwapping',
                  )}
                >
                  <Box>
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
                  </Box>
                </Tooltip>
                {!noExpand &&
                  (isOpen ? (
                    <ChevronUpIcon color='text.subtle' boxSize='1.25rem' />
                  ) : (
                    <ChevronDownIcon color='text.subtle' boxSize='1.25rem' />
                  ))}
              </Flex>
            </Flex>
            {children && <Collapse in={isOpen}>{children}</Collapse>}
          </Stack>
        )
    }
  },
)
