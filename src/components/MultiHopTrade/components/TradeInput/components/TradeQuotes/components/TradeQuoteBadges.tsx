import type { FlexProps } from '@chakra-ui/react'
import { Flex, Tag, TagLeftIcon, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import type { IconType } from 'react-icons'
import { TbClockHour3, TbGasStation, TbRosetteDiscountCheckFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import { breakpoints } from '@/theme/theme'

type QuoteBadgeProps = { icon: IconType; label: string; hideLabel?: boolean }
const QuoteBadge: FC<QuoteBadgeProps> = ({ icon, label, hideLabel = false }) => {
  const badgeBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  return (
    <TooltipWithTouch label={hideLabel ? label : undefined}>
      <Tag gap={1.5} padding={2} rounded='full' backgroundColor={badgeBg} whiteSpace='nowrap'>
        {hideLabel ? null : label}
        <TagLeftIcon as={icon} color='green.500' margin={0} />
      </Tag>
    </TooltipWithTouch>
  )
}

export type TradeQuoteBadgesProps = FlexProps & {
  isBestRate?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  quoteDisplayOption: QuoteDisplayOption
}
export const TradeQuoteBadges: React.FC<TradeQuoteBadgesProps> = ({
  isBestRate,
  isFastest,
  isLowestGas,
  quoteDisplayOption,
  ...rest
}) => {
  const translate = useTranslate()

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const badgeCount = useMemo(
    () => [isBestRate, isFastest, isLowestGas].reduce((acc, curr) => (curr ? acc + 1 : acc), 0),
    [isBestRate, isFastest, isLowestGas],
  )
  const hideLabel = useMemo(() => {
    if (quoteDisplayOption === QuoteDisplayOption.Advanced) {
      return badgeCount > 1
    } else {
      return isLargerThanMd ? undefined : badgeCount > 2
    }
  }, [badgeCount, isLargerThanMd, quoteDisplayOption])

  if (badgeCount === 0) return null

  return (
    <Flex alignItems='center' gap={2} {...rest}>
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
