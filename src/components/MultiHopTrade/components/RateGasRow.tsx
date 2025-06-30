import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from '@chakra-ui/icons'
import type { FlexProps, StackProps } from '@chakra-ui/react'
import {
  Box,
  Collapse,
  Flex,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Stack,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import type { FC, PropsWithChildren } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { SwapperIcons } from './SwapperIcons'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { clickableLinkSx } from '@/theme/styles'

type RateGasRowProps = {
  affiliateBps: string
  buyAssetId: AssetId
  isLoading?: boolean
  rate: string | undefined
  sellAssetId: AssetId
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
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
    buyAssetId,
    children,
    isLoading,
    rate,
    sellAssetId,
    swapperName,
    swapSource,
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
    const buyAsset = useAppSelector(state => selectAssetById(state, buyAssetId))
    const sellAsset = useAppSelector(state => selectAssetById(state, sellAssetId))

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
      if (!(rate && buyAsset && sellAsset)) return null

      const prefix = shouldInvertRate ? `1 ${buyAsset.symbol} =` : `1 ${sellAsset.symbol} =`
      const value = shouldInvertRate ? bn(1).div(rate).toString() : rate
      const symbol = shouldInvertRate ? sellAsset.symbol : buyAsset.symbol

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
    }, [rate, buyAsset, sellAsset, shouldInvertRate, handleRateClick, deltaPercentageFormatted])

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
                    <SwapperIcons swapperName={swapperName} swapSource={swapSource} />
                    {rateContent}
                    <Popover
                      trigger='hover'
                      placement='top'
                      isLazy
                      openDelay={0}
                      closeDelay={300}
                      gutter={8}
                    >
                      <PopoverTrigger>
                        <InfoIcon color='text.subtle' boxSize='0.75rem' cursor='pointer' />
                      </PopoverTrigger>
                      <PopoverContent width='auto' maxWidth='300px' zIndex={9999}>
                        <PopoverArrow />
                        <PopoverBody p={3}>{feePopoverContent}</PopoverBody>
                      </PopoverContent>
                    </Popover>
                  </Stack>
                </Row.Value>
              </Row>
              <Flex gap={1} alignItems='center'>
                <Tooltip label={translate('trade.tooltip.continueSwapping')}>
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
