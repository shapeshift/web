import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetRowLoading } from './AssetRowLoading'

export type AssetMenuButtonProps = {
  assetId?: AssetId
  onAssetClick?: () => void
  isDisabled: boolean
  buttonProps?: ButtonProps
  isLoading?: boolean
}

export const AssetMenuButton = ({
  assetId,
  onAssetClick,
  isDisabled,
  buttonProps,
  isLoading,
}: AssetMenuButtonProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const icon = useMemo(() => {
    return asset?.icons ? (
      <PairIcons icons={asset.icons} iconBoxSize='5' h='38px' p={1} borderRadius={8} />
    ) : (
      <AssetIcon assetId={assetId} size='xs' showNetworkIcon={false} />
    )
  }, [asset?.icons, assetId])

  if (!assetId || isLoading) return <AssetRowLoading {...buttonProps} />

  return (
    <Button
      onClick={onAssetClick}
      flexGrow={0}
      flexShrink={0}
      isDisabled={isDisabled}
      isLoading={isLoading}
      {...buttonProps}
    >
      <Flex alignItems='center' gap={2}>
        {icon}
        {asset?.symbol}
      </Flex>
    </Button>
  )
}
