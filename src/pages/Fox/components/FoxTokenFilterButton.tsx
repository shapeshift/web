import { Button, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { AssetIcon } from '@/components/AssetIcon'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type Filter = {
  label: string
  chainId?: string
  assetId?: AssetId
  asset?: Asset
}

type FoxTokenFilterButtonProps = {
  filter: Filter
  onFilterClick: (filter: Filter) => void
  isSelected: boolean
  asset?: Asset
}

const buttonsHover = {
  opacity: '.6',
}

const pairProps = {
  showFirst: true,
  displayMode: 'side-by-side' as const,
}

export const FoxTokenFilterButton = ({
  filter,
  onFilterClick,
  isSelected,
  asset,
}: FoxTokenFilterButtonProps) => {
  const buttonsBgColor = useColorModeValue('gray.100', 'white')
  const buttonsColor = useColorModeValue('gray.500', 'white')
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, filter.chainId ?? ''))

  const iconSrc = feeAsset?.networkIcon

  const networkIcon = useMemo(() => {
    if (asset) {
      return <AssetIcon assetId={asset.assetId} pairProps={pairProps} size='xs' />
    }

    if (iconSrc) {
      return <AssetIcon src={iconSrc} size='xs' />
    }

    return <AssetIcon assetId={feeAsset?.assetId ?? ''} size='xs' />
  }, [asset, feeAsset, iconSrc])

  return (
    <Button
      key={filter.label}
      size='sm'
      colorScheme='gray'
      borderRadius='full'
      _hover={buttonsHover}
      variant={isSelected ? 'solid' : 'outline'}
      backgroundColor={isSelected ? buttonsBgColor : 'transparent'}
      color={isSelected ? 'gray.900' : buttonsColor}
      // eslint-disable-next-line react-memo/require-usememo
      onClick={() => onFilterClick(filter)}
      leftIcon={filter.assetId ? networkIcon : undefined}
    >
      {filter.label}
    </Button>
  )
}
