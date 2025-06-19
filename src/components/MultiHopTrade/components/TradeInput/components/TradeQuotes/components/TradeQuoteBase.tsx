import { WarningIcon } from '@chakra-ui/icons'
import type { CardProps, FlexProps } from '@chakra-ui/react'
import {
  Box,
  Card,
  Circle,
  Flex,
  Icon,
  Skeleton,
  Tag,
  TagLeftIcon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import prettyMilliseconds from 'pretty-ms'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import {
  TbBolt,
  TbClockHour3,
  TbGasStation,
  TbRipple,
  TbRosetteDiscountCheckFilled,
} from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { getQuoteErrorTranslation } from '../../../getQuoteErrorTranslation'

import { Amount } from '@/components/Amount/Amount'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import type { BigNumber } from '@/lib/bignumber/bignumber'
import type { ErrorWithMeta, TradeQuoteError } from '@/state/apis/swapper/types'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'

const hoverDottedUnderline = { textDecorationStyle: 'solid' }
const cardBorderRadius = { base: 'md', md: 'lg' }
const cardHoverProps = {
  cursor: 'pointer',
  bg: 'background.surface.hover',
}

export type TradeQuoteCardProps = {
  isActive: boolean
  isActionable: boolean
  isDisabled: boolean
} & CardProps

export const TradeQuoteCard = ({
  isActive,
  isActionable,
  isDisabled,
  onClick,
  ...rest
}: TradeQuoteCardProps) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const redColor = useColorModeValue('red.500', 'red.200')
  const focusColor = useColorModeValue('blackAlpha.400', 'whiteAlpha.400')

  const activeSwapperColor = useMemo(() => {
    if (!isActionable) return redColor
    if (isActive) return 'border.focused'
    return borderColor
  }, [borderColor, isActionable, isActive, redColor])

  const activeProps = useMemo(
    () => ({ borderColor: isActive ? 'transparent' : focusColor }),
    [focusColor, isActive],
  )

  return (
    <Card
      borderWidth={2}
      px={4}
      py={3}
      boxShadow='none'
      bg={isActive ? 'background.surface.hover' : 'transparent'}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      borderColor={isActive ? activeSwapperColor : 'border.base'}
      _hover={isDisabled ? undefined : cardHoverProps}
      _active={isDisabled ? undefined : activeProps}
      borderRadius={cardBorderRadius}
      size='sm'
      gap={4}
      flexDir='column'
      width='full'
      fontSize='sm'
      onClick={isDisabled ? undefined : onClick}
      transitionProperty='common'
      transitionDuration='normal'
      {...rest}
    />
  )
}

export const TradeQuoteCardHeader: React.FC<FlexProps> = props => (
  <Flex {...props} alignItems='center' justifyContent='space-between' />
)

export type TradeQuoteCardExchangeRateProps = FlexProps & {
  buyAsset: Asset
  sellAsset: Asset
  amountReceivedCrypto: string
  sellAmountCrypto: string
}
export const TradeQuoteCardExchangeRate: React.FC<TradeQuoteCardExchangeRateProps> = ({
  sellAsset,
  buyAsset,
  amountReceivedCrypto,
  sellAmountCrypto,
  ...rest
}) => {
  const [shouldFlipRate, setShouldFlipRate] = useState<boolean>(false)

  const exchangeRate = useMemo((): BigNumber.Value => {
    const rate = bn(amountReceivedCrypto).dividedBy(bn(sellAmountCrypto))
    return shouldFlipRate ? bn(1).dividedBy(rate) : rate
  }, [amountReceivedCrypto, sellAmountCrypto, shouldFlipRate])

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const handleFlipRate = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      e.stopPropagation()
      setShouldFlipRate(!shouldFlipRate)
    },
    [shouldFlipRate],
  )

  const fromAsset = shouldFlipRate ? buyAsset : sellAsset
  const toAsset = shouldFlipRate ? sellAsset : buyAsset

  return (
    <Flex
      gap={1}
      alignItems='center'
      fontSize='sm'
      fontWeight='medium'
      textUnderlineOffset='4px'
      textDecoration='underline dotted'
      onClick={handleFlipRate}
      _hover={hoverDottedUnderline}
      {...rest}
    >
      {`1 ${fromAsset.symbol} = ${toCrypto(exchangeRate, toAsset.symbol)}`}
    </Flex>
  )
}

export type TradeQuoteCardValueProps = FlexProps & {
  isLoading: boolean
  isCryptoAmountValid: boolean
  cryptoAmount: string
  buyAsset: Asset
  buyAssetMarketData?: MarketData
  buyAmountBeforeFees?: string
  isTradingWithoutMarketData: boolean
}
export const TradeQuoteCardValue: React.FC<TradeQuoteCardValueProps> = ({
  isLoading,
  cryptoAmount,
  isCryptoAmountValid,
  isTradingWithoutMarketData,
  buyAssetMarketData,
  buyAsset,
  buyAmountBeforeFees,
  ...rest
}) => {
  const fiatReceivedAmount = useMemo(
    () =>
      isTradingWithoutMarketData
        ? undefined
        : bn(cryptoAmount)
            .times(bnOrZero(buyAssetMarketData?.price))
            .toString(),
    [buyAssetMarketData?.price, cryptoAmount, isTradingWithoutMarketData],
  )

  const fiatDiffAmount = useMemo((): number => {
    if (buyAmountBeforeFees === undefined || fiatReceivedAmount === undefined) return 0

    return bn(fiatReceivedAmount).minus(buyAmountBeforeFees).toNumber()
  }, [buyAmountBeforeFees, fiatReceivedAmount])

  return (
    <Flex flexDir='column' gap={1} {...rest}>
      <Skeleton isLoaded={!isLoading}>
        <Amount.Crypto
          value={isCryptoAmountValid ? cryptoAmount : '0'}
          symbol={buyAsset.symbol}
          fontSize='2xl'
          fontWeight='normal'
          lineHeight={1}
        />
      </Skeleton>
      <Skeleton isLoaded={!isLoading}>
        <Flex gap={1}>
          {fiatReceivedAmount ? (
            <Amount.Fiat color='text.subtle' value={fiatReceivedAmount} prefix='≈' />
          ) : null}
          {fiatDiffAmount !== 0 ? (
            <Flex color='text.subtle'>
              (<Amount.Fiat value={fiatDiffAmount} />)
            </Flex>
          ) : null}
        </Flex>
      </Skeleton>
    </Flex>
  )
}

type QuoteBadgeProps = { icon: IconType; label?: string; iconMode?: boolean }
const QuoteBadge: FC<QuoteBadgeProps> = ({ icon, label, iconMode = false }) => {
  const badgeBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  return (
    <Tooltip label={iconMode ? label : undefined}>
      <Tag gap={1.5} padding={2} rounded='full' backgroundColor={badgeBg} whiteSpace='nowrap'>
        {iconMode ? null : label}
        <TagLeftIcon as={icon} color='green.500' margin={0} />
      </Tag>
    </Tooltip>
  )
}

export type TradeQuoteCardBadgesProps = FlexProps & {
  isBest?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  iconOnlyIfCount?: number
}
export const TradeQuoteCardBadges: React.FC<TradeQuoteCardBadgesProps> = ({
  isBest,
  isFastest,
  isLowestGas,
  iconOnlyIfCount,
  ...rest
}) => {
  const translate = useTranslate()

  const badgeCount = [isBest, isFastest, isLowestGas].reduce(
    (acc, curr) => (curr ? acc + 1 : acc),
    0,
  )
  const iconOnly = iconOnlyIfCount !== undefined && badgeCount >= iconOnlyIfCount
  const tagArr = []

  if (isBest) {
    tagArr.push(
      <QuoteBadge
        icon={TbRosetteDiscountCheckFilled}
        iconMode={iconOnly}
        label={translate('trade.quoteBadge.best')}
      />,
    )
  }

  if (isFastest) {
    tagArr.push(
      <QuoteBadge
        icon={TbClockHour3}
        iconMode={iconOnly}
        label={translate('trade.quoteBadge.fastest')}
      />,
    )
  }

  if (isLowestGas) {
    tagArr.push(
      <QuoteBadge
        icon={TbGasStation}
        iconMode={iconOnly}
        label={translate('trade.quoteBadge.lowestGas')}
      />,
    )
  }

  if (tagArr.length === 0) return null

  return (
    <Flex alignItems='center' gap={2} {...rest}>
      {tagArr}
    </Flex>
  )
}

export const TradeQuoteCardMeta: React.FC<FlexProps> = props => (
  <Flex justifyContent='left' alignItems='center' gap={4} {...props} />
)

type TradeQuoteCardMetaGasProps = FlexProps & { gas?: number; isLoading: boolean }
export const TradeQuoteCardMetaGas: React.FC<TradeQuoteCardMetaGasProps> = ({
  gas,
  isLoading,
  ...rest
}) => {
  const translate = useTranslate()
  return (
    <TradeQuoteCardMetaItem
      tooltip={
        gas !== undefined
          ? translate('trade.quote.gas')
          : translate('trade.tooltip.continueSwapping')
      }
      isLoading={isLoading}
      icon={TbGasStation}
      {...rest}
    >
      {
        // We cannot infer gas fees in specific scenarios, so if the fee is undefined we must render is as such
        gas === undefined ? (
          <Box fontSize='sm'>{translate('trade.unknownGas')}</Box>
        ) : (
          <Amount.Fiat value={gas} />
        )
      }
    </TradeQuoteCardMetaItem>
  )
}

type TradeQuoteCardMetaSlippageProps = FlexProps & {
  isLoading: boolean
  isStreaming?: boolean
  quoteSlippagePc?: string
  customUserSlippagePc?: string
}
export const TradeQuoteCardMetaSlippage: React.FC<TradeQuoteCardMetaSlippageProps> = ({
  isStreaming,
  quoteSlippagePc,
  customUserSlippagePc,
  isLoading,
  ...rest
}) => {
  const translate = useTranslate()
  const {
    number: { toPercent },
  } = useLocaleFormatter()
  const slippage = isStreaming
    ? 'Auto'
    : quoteSlippagePc !== undefined
    ? toPercent(quoteSlippagePc)
    : null

  const customSlippageFailed =
    customUserSlippagePc !== undefined &&
    ((quoteSlippagePc !== customUserSlippagePc && slippage !== null) || isStreaming)

  return (
    <TradeQuoteCardMetaItem
      tooltip={
        customSlippageFailed
          ? translate('trade.quote.cantSetSlippage')
          : translate('trade.quote.slippage')
      }
      isLoading={isLoading}
      icon={TbRipple}
      {...rest}
    >
      <Flex alignItems='center' gap={1} color={customSlippageFailed ? 'text.error' : undefined}>
        {slippage}
        {customSlippageFailed && <WarningIcon color='text.error' />}
      </Flex>
    </TradeQuoteCardMetaItem>
  )
}

type TradeQuoteCardMetaTimeEstimateProps = FlexProps & {
  quoteSteps: TradeQuote['steps']
  isLoading: boolean
}
export const TradeQuoteCardMetaTimeEstimate: React.FC<TradeQuoteCardMetaTimeEstimateProps> = ({
  quoteSteps,
  isLoading,
  ...rest
}) => {
  const translate = useTranslate()
  const totalEstimatedExecutionTimeMs = useMemo(() => {
    if (quoteSteps.every(step => step.estimatedExecutionTimeMs === undefined)) return

    return quoteSteps.reduce((acc, step) => {
      return acc + (step.estimatedExecutionTimeMs ?? 0)
    }, 0)
  }, [quoteSteps])

  return (
    <TradeQuoteCardMetaItem
      tooltip={translate('trade.quote.timeEstimate')}
      isLoading={isLoading}
      icon={TbClockHour3}
      {...rest}
    >
      {totalEstimatedExecutionTimeMs ? prettyMilliseconds(totalEstimatedExecutionTimeMs) : '-'}
    </TradeQuoteCardMetaItem>
  )
}

type TradeQuoteCardMetaPriceImpactProps = FlexProps & {
  quote: TradeQuote | TradeRate | undefined
  isLoading: boolean
}
export const TradeQuoteCardMetaPriceImpact: React.FC<TradeQuoteCardMetaPriceImpactProps> = ({
  quote,
  isLoading,
  ...rest
}) => {
  const translate = useTranslate()

  const {
    isModeratePriceImpact,
    isHighPriceImpact,
    priceImpactPercentageAbsolute,
    isPositivePriceImpact,
  } = usePriceImpact(quote)

  const priceImpactPc = useMemo(
    () => priceImpactPercentageAbsolute?.div(100).toNumber(),
    [priceImpactPercentageAbsolute],
  )

  const priceImpactColor = useMemo(() => {
    switch (true) {
      case isHighPriceImpact:
        return 'text.error'
      case isModeratePriceImpact:
        return 'text.warning'
      case isPositivePriceImpact:
        return 'text.success'
      default:
        return undefined
    }
  }, [isHighPriceImpact, isModeratePriceImpact, isPositivePriceImpact])

  return (
    <TradeQuoteCardMetaItem
      tooltip={translate('trade.quote.priceImpact')}
      isLoading={isLoading}
      icon={TbBolt}
      {...rest}
    >
      <Amount.Percent value={priceImpactPc} color={priceImpactColor} />
    </TradeQuoteCardMetaItem>
  )
}

type TradeQuoteCardMetaItemProps = FlexProps & {
  tooltip: string
  icon: IconType
  isLoading: boolean
}
export const TradeQuoteCardMetaItem: React.FC<TradeQuoteCardMetaItemProps> = ({
  tooltip,
  icon,
  isLoading,
  children,
  ...rest
}) => (
  <Tooltip label={tooltip}>
    <Flex gap={1} alignItems='center' {...rest}>
      <Icon as={icon} color='text.subtle' boxSize={18} />
      <Skeleton isLoaded={!isLoading}>{children}</Skeleton>
    </Flex>
  </Tooltip>
)

const WarningCircle: FC = () => (
  <Circle size={6}>
    <WarningIcon color='text.error' boxSize={4} />
  </Circle>
)

type TradeQuoteCardErrorProps = {
  hasAmountWithPositiveReceive: boolean
  isAmountEntered: boolean
  errors: ErrorWithMeta<TradeQuoteError>[]
}
export const TradeQuoteCardError: React.FC<TradeQuoteCardErrorProps> = ({
  errors,
  hasAmountWithPositiveReceive,
  isAmountEntered,
}) => {
  const translate = useTranslate()

  const error = errors?.[0]
  const defaultError = { error: TradeQuoteValidationError.UnknownError }

  if (error !== undefined) {
    const translationParams = getQuoteErrorTranslation(error ?? defaultError)
    const tooltipLabel = translate(
      ...(Array.isArray(translationParams) ? translationParams : [translationParams]),
    )
    return (
      <TooltipWithTouch label={tooltipLabel}>
        <WarningCircle />
      </TooltipWithTouch>
    )
  }

  if (!hasAmountWithPositiveReceive && isAmountEntered) {
    return (
      <TooltipWithTouch label={translate('trade.rates.tags.negativeRatio')}>
        <WarningCircle />
      </TooltipWithTouch>
    )
  }
}
