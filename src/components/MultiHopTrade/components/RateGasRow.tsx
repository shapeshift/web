import { ArrowUpDownIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import {
  Box,
  Collapse,
  Flex,
  Link,
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
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { FC, PropsWithChildren } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { SwapperIcons } from './SwapperIcons'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { selectVotingPower } from '@/state/apis/snapshot/selectors'
import { useAppSelector } from '@/state/store'
import { clickableLinkSx } from '@/theme/styles'

type RateGasRowProps = {
  affiliateBps: string | undefined
  buyAssetSymbol: string
  isDisabled?: boolean
  isLoading?: boolean
  rate: string | undefined
  sellAssetSymbol: string
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  networkFeeFiatUserCurrency: string | undefined
  deltaPercentage?: string | null
  onClick?: () => void
  invertRate?: boolean
  noExpand?: boolean
  isOpen?: boolean
} & PropsWithChildren

const helpersTooltipFlexProps: FlexProps = { flexDirection: 'row-reverse' }
const rowHover = { bg: 'background.surface.raised.base' }
const rateHover = {
  cursor: 'pointer',
  '.rate': { borderColor: 'text.link' },
}

export const RateGasRow: FC<RateGasRowProps> = memo(
  ({
    affiliateBps,
    buyAssetSymbol,
    children,
    isDisabled,
    isLoading,
    rate,
    sellAssetSymbol,
    swapperName,
    swapSource,
    networkFeeFiatUserCurrency,
    deltaPercentage,
    onClick,
    noExpand,
    invertRate = false,
  }) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure()
    const [shouldInvertRate, setShouldInvertRate] = useState(invertRate)
    const hasClickedRate = useRef(false)
    const foxBalanceCryptoPrecision = useAppSelector(state =>
      selectVotingPower(state, { feeModel: 'SWAPPER' }),
    )

    const feeMessage = useMemo(() => {
      if (!affiliateBps || bnOrZero(affiliateBps).isZero())
        return translate('trade.freeTrade', {
          foxBalance: bnOrZero(foxBalanceCryptoPrecision).toFixed(0),
        })

      const feePercentage = bnOrZero(affiliateBps).div(100).toString()
      return translate('trade.feeExplainer', {
        feePercentage,
        foxBalance: bnOrZero(foxBalanceCryptoPrecision).toFixed(0),
      })
    }, [affiliateBps, foxBalanceCryptoPrecision, translate])

    const feePopoverContent = useMemo(() => {
      return (
        <Stack spacing={2}>
          <Text color='text.subtle' translation={feeMessage} />
          <Link href='/#/fox' isExternal color='blue.500'>
            <Text translation='trade.learnMoreAboutFox' />
          </Link>
        </Stack>
      )
    }, [feeMessage])

    useEffect(() => {
      if (!hasClickedRate.current) {
        setShouldInvertRate(invertRate)
      }
    }, [invertRate])

    const handleRateClick = useCallback(() => {
      hasClickedRate.current = true
      setShouldInvertRate(prev => !prev)
    }, [])

    // Compute the inverse rate for toggling between display formats:
    const inverseRate = useMemo(() => {
      const parsedRate = bnOrZero(rate)
      if (parsedRate.isZero() || parsedRate.isNegative()) return '0'
      return bnOrZero(1).div(parsedRate).toFixed(8)
    }, [rate])

    const deltaPercentageFormatted = useMemo(() => {
      if (!deltaPercentage) return null
      const deltaPercentageDecimals = bnOrZero(deltaPercentage).abs().toFixed(2)

      if (bnOrZero(deltaPercentageDecimals).isZero()) return null

      return (
        <RawText
          as='span'
          color={bnOrZero(deltaPercentageDecimals).gt(0) ? 'green.500' : 'red.500'}
          ml={1}
        >
          {` (${bnOrZero(deltaPercentageDecimals).gt(0) ? '+' : '-'}${deltaPercentageDecimals}%)`}
        </RawText>
      )
    }, [deltaPercentage])

    const rateContent = useMemo(() => {
      if (!rate) return null
      const rateText = shouldInvertRate
        ? `1 ${buyAssetSymbol} = ${inverseRate} ${sellAssetSymbol}`
        : `1 ${sellAssetSymbol} = ${rate} ${buyAssetSymbol}`

      return (
        <Skeleton isLoaded={!isLoading}>
          <RawText
            color='text.subtle'
            fontWeight='medium'
            onClick={handleRateClick}
            sx={clickableLinkSx}
            cursor='pointer'
            mb='0'
            userSelect='none'
          >
            {rateText}
            {deltaPercentageFormatted}
          </RawText>
        </Skeleton>
      )
    }, [
      buyAssetSymbol,
      deltaPercentageFormatted,
      handleRateClick,
      isLoading,
      rate,
      sellAssetSymbol,
      inverseRate,
      shouldInvertRate,
    ])

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
              <Row fontSize='sm' flex={1}>
                <Row.Value
                  fontSize='sm'
                  display='flex'
                  alignItems='center'
                  gap={2}
                  _hover={!isDisabled ? rateHover : undefined}
                  onClick={onClick}
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
                    {rateContent}
                    {!isDisabled && <ArrowUpDownIcon />}
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
              <Flex
                gap={1}
                alignItems='center'
                cursor={noExpand ? 'default' : 'pointer'}
                onClick={noExpand ? undefined : onToggle}
              >
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
