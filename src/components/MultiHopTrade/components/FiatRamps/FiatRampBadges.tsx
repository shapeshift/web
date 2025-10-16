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
}
export const FiatRampBadges: React.FC<FiatRampBadgesProps> = ({
  isCreditCard,
  isBankTransfer,
  isApplePay,
  isGooglePay,
  isSepa,
  ...rest
}) => {
  const translate = useTranslate()

  const badges = useMemo(
    () => [isCreditCard, isBankTransfer, isApplePay, isGooglePay, isSepa],
    [isCreditCard, isBankTransfer, isApplePay, isGooglePay, isSepa],
  )

  const badgeCount = useMemo(
    () => badges.reduce((acc, curr) => (curr ? acc + 1 : acc), 0),
    [badges],
  )

  const totalTextLength = useMemo(() => {
    const lengths = [
      isCreditCard && translate('common.creditCard').length,
      isBankTransfer && translate('common.bankTransfer').length,
      isApplePay && translate('common.applePay').length,
      isGooglePay && translate('common.googlePay').length,
      isSepa && translate('common.sepa').length,
    ].filter(Boolean) as number[]

    // Add 2 chars per badge for spacing and icon visual space
    const SPACING_AND_ICON_CHARS = 2

    return lengths.reduce((total, length) => total + length + SPACING_AND_ICON_CHARS, 0)
  }, [isCreditCard, isBankTransfer, isApplePay, isGooglePay, isSepa, translate])

  const hideLabel = useMemo(() => {
    const TEXT_LENGTH_THRESHOLD = 50
    return totalTextLength > TEXT_LENGTH_THRESHOLD
  }, [totalTextLength])

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
