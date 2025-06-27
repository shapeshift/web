import type { FlexProps } from '@chakra-ui/react'
import { Flex, Tag, TagLeftIcon, Tooltip, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import type { IconType } from 'react-icons'
import { TbClockHour3, TbGasStation, TbRosetteDiscountCheckFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

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

export type TradeQuoteBadgesProps = FlexProps & {
  isBestRate?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  iconOnlyIfCount?: number
}
export const TradeQuoteBadges: React.FC<TradeQuoteBadgesProps> = ({
  isBestRate,
  isFastest,
  isLowestGas,
  iconOnlyIfCount,
  ...rest
}) => {
  const translate = useTranslate()

  const badgeCount = useMemo(
    () => [isBestRate, isFastest, isLowestGas].reduce((acc, curr) => (curr ? acc + 1 : acc), 0),
    [isBestRate, isFastest, isLowestGas],
  )

  const iconOnly = useMemo(
    (): boolean => iconOnlyIfCount !== undefined && badgeCount >= iconOnlyIfCount,
    [badgeCount, iconOnlyIfCount],
  )

  if (badgeCount === 0) return null

  return (
    <Flex alignItems='center' gap={2} {...rest}>
      {isBestRate && (
        <QuoteBadge
          icon={TbRosetteDiscountCheckFilled}
          iconMode={iconOnly}
          label={translate('trade.quoteBadge.bestRate')}
        />
      )}
      {isFastest && (
        <QuoteBadge
          icon={TbClockHour3}
          iconMode={iconOnly}
          label={translate('trade.quoteBadge.fastest')}
        />
      )}
      {isLowestGas && (
        <QuoteBadge
          icon={TbGasStation}
          iconMode={iconOnly}
          label={translate('trade.quoteBadge.lowestGas')}
        />
      )}
    </Flex>
  )
}
