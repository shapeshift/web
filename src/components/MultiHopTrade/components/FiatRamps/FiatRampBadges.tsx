import type { ColorProps, FlexProps } from '@chakra-ui/react'
import { Flex, Tag, TagLeftIcon, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'
import type { IconType } from 'react-icons'
import {
  TbBrandApple,
  TbBrandGoogle,
  TbBuildingBank,
  TbCoinEuro,
  TbCreditCard,
} from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { COMPACT_BADGES_THRESHOLD } from '@/components/MultiHopTrade/components/TradeInput/components/TradeQuotes/components/TradeQuoteBadges'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'
import { breakpoints } from '@/theme/theme'

type FiatRampBadgeProps = {
  icon: IconType
  label: string
  hideLabel?: boolean
  color?: ColorProps['color']
}
const FiatRampBadge: FC<FiatRampBadgeProps> = ({ icon, label, hideLabel = false, color }) => {
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

export type FiatRampBadgesProps = FlexProps & {
  isCreditCard?: boolean
  isBankTransfer?: boolean
  isApplePay?: boolean
  isGooglePay?: boolean
  isSepa?: boolean
  quoteDisplayOption: QuoteDisplayOption
}
export const FiatRampBadges: React.FC<FiatRampBadgesProps> = ({
  isCreditCard,
  isBankTransfer,
  isApplePay,
  isGooglePay,
  isSepa,
  quoteDisplayOption,
  ...rest
}) => {
  const translate = useTranslate()

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const badges = useMemo(
    () => [isCreditCard, isBankTransfer, isApplePay, isGooglePay, isSepa],
    [isCreditCard, isBankTransfer, isApplePay, isGooglePay, isSepa],
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
      {isCreditCard && (
        <FiatRampBadge
          icon={TbCreditCard}
          color='blue.500'
          hideLabel={hideLabel}
          label={translate('common.creditCard')}
        />
      )}
      {isBankTransfer && (
        <FiatRampBadge
          icon={TbBuildingBank}
          color='yellow.500'
          hideLabel={hideLabel}
          label={translate('common.bankTransfer')}
        />
      )}
      {isApplePay && (
        <FiatRampBadge
          color='text.primary'
          icon={TbBrandApple}
          hideLabel={hideLabel}
          label={translate('common.applePay')}
        />
      )}
      {isGooglePay && (
        <FiatRampBadge
          color='text.primary'
          icon={TbBrandGoogle}
          hideLabel={hideLabel}
          label={translate('common.googlePay')}
        />
      )}
      {isSepa && (
        <FiatRampBadge
          icon={TbCoinEuro}
          hideLabel={hideLabel}
          label={translate('common.sepa')}
          color='pink.500'
        />
      )}
    </Flex>
  )
}
