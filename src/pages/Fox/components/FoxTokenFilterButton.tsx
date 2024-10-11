import { Button, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { AssetIcon } from 'components/AssetIcon'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type Filter = {
  label: string
  chainId?: string
  assetId?: AssetId
}

type FoxTokenFilterButtonProps = {
  filter: Filter
  onFilterClick: (filter: Filter) => void
  isSelected: boolean
}

const buttonsHover = {
  opacity: '.6',
}

export const FoxTokenFilterButton = ({
  filter,
  onFilterClick,
  isSelected,
}: FoxTokenFilterButtonProps) => {
  const buttonsBgColor = useColorModeValue('grey.500', 'white')
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, filter.chainId ?? ''))

  const iconSrc = feeAsset?.networkIcon

  const networkIcon = iconSrc ? (
    <AssetIcon src={iconSrc} size='xs' />
  ) : (
    <AssetIcon assetId={feeAsset?.assetId ?? ''} size='xs' />
  )

  return (
    <Button
      key={filter.label}
      size='sm'
      colorScheme='gray'
      borderRadius='full'
      _hover={buttonsHover}
      variant={isSelected ? 'solid' : 'outline'}
      backgroundColor={isSelected ? buttonsBgColor : 'transparent'}
      color={isSelected ? 'gray.900' : 'white'}
      // eslint-disable-next-line react-memo/require-usememo
      onClick={() => onFilterClick(filter)}
      leftIcon={filter.assetId ? networkIcon : undefined}
    >
      {filter.label}
    </Button>
  )
}
