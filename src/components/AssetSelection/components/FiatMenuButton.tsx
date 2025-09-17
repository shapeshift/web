import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'

import { AssetRowLoading } from './AssetRowLoading'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import type { CommonFiatCurrencies } from '@/components/Modals/FiatRamps/config'
import { getFiatFlagUrl } from '@/constants/fiatLogos'

export type FiatMenuButtonProps = {
  fiat: CommonFiatCurrencies
  onFiatClick?: (fiat: CommonFiatCurrencies) => void
  isDisabled?: boolean
  buttonProps?: ButtonProps
  isLoading?: boolean
}

export const FiatMenuButton = ({
  fiat,
  onFiatClick,
  isDisabled,
  buttonProps,
  isLoading,
}: FiatMenuButtonProps) => {
  const icon = useMemo(() => {
    return <LazyLoadAvatar src={getFiatFlagUrl(fiat)} size='xs' />
  }, [fiat])

  const handleAssetClick = useCallback(() => {
    if (fiat) onFiatClick?.(fiat)
  }, [fiat, onFiatClick])

  if (!fiat || isLoading) return <AssetRowLoading {...buttonProps} />

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
          {fiat}
        </Text>
      </Flex>
    </Button>
  )
}
