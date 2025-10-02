import type { ColorProps, FlexProps } from '@chakra-ui/react'
import { Flex, Tag, TagLeftIcon, useColorModeValue } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { FC } from 'react'
import { useMemo } from 'react'
import type { IconType } from 'react-icons'
import {
  TbClockHour3,
  TbGasStation,
  TbRocket,
  TbRosetteDiscountCheckFilled,
  TbWifi,
} from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import type { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'

type QuoteBadgeProps = {
  icon: IconType
  label: string
  hideLabel?: boolean
  color?: ColorProps['color']
}
const QuoteBadge: FC<QuoteBadgeProps> = ({ icon, label, hideLabel = false, color }) => {
  const badgeBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  return (
    <TooltipWithTouch label={hideLabel ? label : undefined}>
      <Tag gap={1.5} padding={2} rounded='full' backgroundColor={badgeBg} whiteSpace='nowrap'>
        {hideLabel ? null : label}
        <TagLeftIcon as={icon} color={color ?? 'green.500'} margin={0} />
      </Tag>
    </TooltipWithTouch>
  )
}

export const COMPACT_BADGES_THRESHOLD = 3
export const COMPACT_BADGES_CHARACTERS_THRESHOLD = 32
export const COMPACT_BADGES_CHARACTERS_ERRORED_THRESHOLD = 28

export type TradeQuoteBadgesProps = FlexProps & {
  isBestRate?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  isStreaming?: boolean
  isBoost?: boolean
  isError?: boolean
  swapperName?: SwapperName
  quoteDisplayOption: QuoteDisplayOption
}
export const TradeQuoteBadges: React.FC<TradeQuoteBadgesProps> = ({
  isBestRate,
  isFastest,
  isLowestGas,
  isStreaming,
  isBoost,
  isError,
  swapperName,
  quoteDisplayOption,
  ...rest
}) => {
  const translate = useTranslate()

  const badgeConfigs = useMemo(
    () => [
      {
        isVisible: isBoost,
        icon: TbRocket,
        color: 'purple.500',
        translationKey: 'common.boost',
      },
      {
        isVisible: isStreaming,
        icon: TbWifi,
        color: 'purple.500',
        translationKey: swapperName === SwapperName.Chainflip ? 'common.dca' : 'common.streaming',
      },
      {
        isVisible: isBestRate,
        icon: TbRosetteDiscountCheckFilled,
        color: 'green.500',
        translationKey: 'trade.sort.bestRate',
      },
      {
        isVisible: isFastest,
        icon: TbClockHour3,
        color: 'green.500',
        translationKey: 'trade.sort.fastest',
      },
      {
        isVisible: isLowestGas,
        icon: TbGasStation,
        color: 'green.500',
        translationKey: 'trade.sort.lowestGas',
      },
    ],
    [isBoost, isStreaming, isBestRate, isFastest, isLowestGas, swapperName],
  )

  const visibleBadges = useMemo(() => badgeConfigs.filter(badge => badge.isVisible), [badgeConfigs])

  const totalCharacterCount = useMemo(
    () => visibleBadges.reduce((total, badge) => total + translate(badge.translationKey).length, 0),
    [visibleBadges, translate],
  )

  const hideLabel = useMemo(() => {
    if (isError) {
      return totalCharacterCount > COMPACT_BADGES_CHARACTERS_ERRORED_THRESHOLD
    }

    return totalCharacterCount > COMPACT_BADGES_CHARACTERS_THRESHOLD
  }, [totalCharacterCount, isError])

  if (visibleBadges.length === 0) return null

  return (
    <Flex alignItems='center' gap={2} {...rest}>
      {visibleBadges.map(({ icon, color, translationKey }) => (
        <QuoteBadge
          key={translationKey}
          icon={icon}
          color={color}
          hideLabel={hideLabel}
          label={translate(translationKey)}
        />
      ))}
    </Flex>
  )
}
