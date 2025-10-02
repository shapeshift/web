import type { ColorProps, FlexProps } from '@chakra-ui/react'
import { Flex, Tag, TagLeftIcon, useColorModeValue } from '@chakra-ui/react'
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

import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import type { QuoteDisplayOption } from '@/state/slices/preferencesSlice/preferencesSlice'

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
export const COMPACT_FIAT_BADGES_CHARACTERS_THRESHOLD = 36

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

  const badgeConfigs = useMemo(
    () => [
      {
        isVisible: isCreditCard,
        icon: TbCreditCard,
        color: 'blue.500',
        translationKey: 'common.creditCard',
      },
      {
        isVisible: isBankTransfer,
        icon: TbBuildingBank,
        color: 'yellow.500',
        translationKey: 'common.bankTransfer',
      },
      {
        isVisible: isApplePay,
        icon: TbBrandApple,
        color: 'text.primary',
        translationKey: 'common.applePay',
      },
      {
        isVisible: isGooglePay,
        icon: TbBrandGoogle,
        color: 'text.primary',
        translationKey: 'common.googlePay',
      },
      { isVisible: isSepa, icon: TbCoinEuro, color: 'pink.500', translationKey: 'common.sepa' },
    ],
    [isCreditCard, isBankTransfer, isApplePay, isGooglePay, isSepa],
  )

  const visibleBadges = useMemo(() => badgeConfigs.filter(badge => badge.isVisible), [badgeConfigs])

  const totalCharacterCount = useMemo(
    () => visibleBadges.reduce((total, badge) => total + translate(badge.translationKey).length, 0),
    [visibleBadges, translate],
  )

  const hideLabel = useMemo(() => {
    return totalCharacterCount > COMPACT_FIAT_BADGES_CHARACTERS_THRESHOLD
  }, [totalCharacterCount])

  if (visibleBadges.length === 0) return null

  return (
    <Flex alignItems='center' gap={2} {...rest}>
      {visibleBadges.map(({ icon, color, translationKey }) => (
        <FiatRampBadge
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
