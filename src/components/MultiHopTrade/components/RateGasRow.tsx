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
import type { FC, PropsWithChildren } from 'react'
import { memo, useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { SwapperIcons } from './SwapperIcons'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectVotingPower } from '@/state/apis/snapshot/selectors'
import { useAppSelector } from '@/state/store'

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
  onClick?: () => void
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
    onClick,
    noExpand,
    isOpen: defaultIsOpen,
  }) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })

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
              <Box>
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
                      <Amount.Crypto fontSize='sm' value='1' symbol={sellAssetSymbol} suffix='=' />
                      <Amount.Crypto fontSize='sm' value={rate} symbol={buyAssetSymbol} />
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
              </Box>
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
