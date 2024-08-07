import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { useCallback, useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetRowLoading } from './AssetRowLoading'

export type AssetMenuButtonProps = {
  assetId?: AssetId
  onAssetClick?: (asset: Asset) => void
  isDisabled: boolean
  buttonProps?: ButtonProps
  isLoading?: boolean
  showNetworkIcon?: boolean
}

export const AssetMenuButton = ({
  assetId,
  onAssetClick,
  isDisabled,
  buttonProps,
  isLoading,
  showNetworkIcon,
}: AssetMenuButtonProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const icon = useMemo(() => {
    if (asset?.icons) return <PairIcons icons={asset.icons} iconBoxSize='24px' showFirst />
    if (assetId) return <AssetIcon assetId={assetId} size='xs' showNetworkIcon={showNetworkIcon} />
    return null
  }, [asset?.icons, assetId, showNetworkIcon])

  const handleAssetClick = useCallback(() => {
    if (asset) onAssetClick?.(asset)
  }, [asset, onAssetClick])

  if (!assetId || isLoading) return <AssetRowLoading {...buttonProps} />

  return (
    <Button
      onClick={handleAssetClick}
      flexGrow={0}
      flexShrink={0}
      isDisabled={isDisabled}
      isLoading={isLoading}
      {...buttonProps}
    >
      <Flex alignItems='center' gap={2} width='100%' overflow='hidden'>
        {icon}
        <Text as='span' textOverflow='ellipsis' overflow='hidden'>
          {asset?.symbol}
        </Text>
      </Flex>
    </Button>
  )
}
