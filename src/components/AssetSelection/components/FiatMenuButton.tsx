import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'

import { AssetRowLoading } from './AssetRowLoading'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'
import { fiatCurrencyFlagUrlsByCode } from '@/lib/fiatCurrencies/fiatCurrencies'

export type FiatMenuButtonProps = {
  selectedFiatCurrency: FiatCurrencyItem
  onClick?: () => void
  onSelectFiat?: (fiat: FiatCurrencyItem) => void
  isDisabled?: boolean
  buttonProps?: ButtonProps
  isLoading?: boolean
}

export const FiatMenuButton = ({
  selectedFiatCurrency,
  onClick,
  onSelectFiat,
  isDisabled,
  buttonProps,
  isLoading,
}: FiatMenuButtonProps) => {
  const icon = useMemo(() => {
    return (
      <LazyLoadAvatar
        src={fiatCurrencyFlagUrlsByCode[selectedFiatCurrency.code]}
        size='xs'
        name={selectedFiatCurrency.name}
      />
    )
  }, [selectedFiatCurrency])

  const handleAssetClick = useCallback(() => {
    if (onClick) {
      onClick()
      return
    }
    onSelectFiat?.(selectedFiatCurrency)
  }, [onClick, onSelectFiat, selectedFiatCurrency])

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
