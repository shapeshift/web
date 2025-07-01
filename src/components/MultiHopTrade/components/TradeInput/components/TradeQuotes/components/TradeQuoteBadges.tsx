import type { FlexProps } from '@chakra-ui/react'
import { Flex, Tag, TagLeftIcon, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import type { IconType } from 'react-icons'
import { FaTrophy } from 'react-icons/fa'
import { TbClockHour3, TbGasStation, TbRosetteDiscountCheckFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { breakpoints } from '@/theme/theme'

type QuoteBadgeProps = { icon: IconType; label?: string }
const QuoteBadge: FC<QuoteBadgeProps> = ({ icon, label }) => {
  const badgeBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  return (
    <Tag gap={1.5} padding={2} rounded='full' backgroundColor={badgeBg} whiteSpace='nowrap'>
      {label}
      <TagLeftIcon as={icon} color='green.500' margin={0} />
    </Tag>
  )
}

export type TradeQuoteBadgesProps = FlexProps & {
  isBestRate?: boolean
  isFastest?: boolean
  isLowestGas?: boolean
  compactBadgeThreshold?: number
}
export const TradeQuoteBadges: React.FC<TradeQuoteBadgesProps> = ({
  isBestRate,
  isFastest,
  isLowestGas,
  compactBadgeThreshold,
  ...rest
}) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const translate = useTranslate()

  const badgeCount = useMemo(
    () => [isBestRate, isFastest, isLowestGas].reduce((acc, curr) => acc + Number(curr), 0),
    [isBestRate, isFastest, isLowestGas],
  )

  if (badgeCount === 0) return null

  if (!isLargerThanMd && badgeCount === 3) {
    return (
      <Flex alignItems='center' gap={2} {...rest}>
        <QuoteBadge icon={FaTrophy} label={translate('trade.quoteBadge.bestQuote')} />
      </Flex>
    )
  }

  return (
    <Flex alignItems='center' gap={2} {...rest}>
      {isBestRate && (
        <QuoteBadge
          icon={TbRosetteDiscountCheckFilled}
          label={translate('trade.quoteBadge.bestRate')}
        />
      )}
      {isFastest && (
        <QuoteBadge icon={TbClockHour3} label={translate('trade.quoteBadge.fastest')} />
      )}
      {isLowestGas && (
        <QuoteBadge icon={TbGasStation} label={translate('trade.quoteBadge.lowestGas')} />
      )}
    </Flex>
  )
}
