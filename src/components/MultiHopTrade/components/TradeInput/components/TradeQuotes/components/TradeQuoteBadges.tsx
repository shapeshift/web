import type { ColorProps, FlexProps } from '@chakra-ui/react'
import { Flex, Tag, TagLeftIcon, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
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
import { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import { breakpoints } from '@/theme/theme'

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

export type TradeQuoteBadgesProps = FlexProps & {
  isBestRate?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  isStreaming?: boolean
  isBoost?: boolean
  swapperName?: SwapperName
  quoteDisplayOption: QuoteDisplayOption
}
export const TradeQuoteBadges: React.FC<TradeQuoteBadgesProps> = ({
  isBestRate,
  isFastest,
  isLowestGas,
  isStreaming,
  isBoost,
  swapperName,
  quoteDisplayOption,
  ...rest
}) => {
  const translate = useTranslate()

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const badges = useMemo(
    () => [isBestRate, isFastest, isLowestGas, isStreaming, isBoost],
    [isBestRate, isFastest, isLowestGas, isStreaming, isBoost],
  )

  const badgeCount = useMemo(
    () => badges.reduce((acc, curr) => (curr ? acc + 1 : acc), 0),
    [badges],
  )
  const hideLabel = useMemo(() => {
    if (quoteDisplayOption === QuoteDisplayOption.Advanced) {
      return badgeCount > 1
    } else {
      return isLargerThanMd ? badgeCount > COMPACT_BADGES_THRESHOLD : badgeCount > 2
    }
  }, [badgeCount, isLargerThanMd, quoteDisplayOption])

  if (badgeCount === 0) return null

  return (
    <Flex alignItems='center' gap={2} {...rest}>
      {isBoost && (
        <QuoteBadge
          icon={TbRocket}
          color='purple.500'
          hideLabel={hideLabel}
          label={translate('common.boost')}
        />
      )}
      {isStreaming && (
        <QuoteBadge
          icon={TbWifi}
          color='purple.500'
          hideLabel={hideLabel}
          label={translate(
            swapperName === SwapperName.Chainflip ? 'common.dca' : 'common.streaming',
          )}
        />
      )}
      {isBestRate && (
        <QuoteBadge
          icon={TbRosetteDiscountCheckFilled}
          hideLabel={hideLabel}
          label={translate('trade.sort.bestRate')}
        />
      )}
      {isFastest && (
        <QuoteBadge
          icon={TbClockHour3}
          hideLabel={hideLabel}
          label={translate('trade.sort.fastest')}
        />
      )}
      {isLowestGas && (
        <QuoteBadge
          icon={TbGasStation}
          hideLabel={hideLabel}
          label={translate('trade.sort.lowestGas')}
        />
      )}
    </Flex>
  )
}
