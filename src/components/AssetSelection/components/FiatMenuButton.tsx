import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'

import { AssetRowLoading } from './AssetRowLoading'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import type { FiatCurrencyItem } from '@/components/Modals/FiatRamps/config'
import { getFiatFlagUrl } from '@/constants/fiatLogos'

export type FiatMenuButtonProps = {
  selectedFiatCurrency: FiatCurrencyItem
  onClick?: () => void
  isDisabled?: boolean
  buttonProps?: ButtonProps
  isLoading?: boolean
}

export const FiatMenuButton = ({
  selectedFiatCurrency,
  onClick,
  isDisabled,
  buttonProps,
  isLoading,
}: FiatMenuButtonProps) => {
  const flagUrl = useMemo(() => {
    return getFiatFlagUrl(selectedFiatCurrency)
  }, [selectedFiatCurrency])

  const icon = useMemo(() => {
    return <LazyLoadAvatar src={flagUrl} size='xs' name={selectedFiatCurrency.name} />
  }, [selectedFiatCurrency, flagUrl])

  const handleAssetClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  if (!selectedFiatCurrency || isLoading) return <AssetRowLoading {...buttonProps} />

  return (
    <Button
      onClick={handleAssetClick}
      flexGrow={0}
      flexShrink={0}
      isDisabled={isDisabled}
      isLoading={isLoading}
      {...buttonProps}
    >
      <Flex alignItems='center' gap={2} width='100%' overflow='visible' mx={1}>
        {icon}
        <Text as='span' textOverflow='ellipsis' overflow='hidden'>
          {selectedFiatCurrency.code}
        </Text>
      </Flex>
    </Button>
  )
}
