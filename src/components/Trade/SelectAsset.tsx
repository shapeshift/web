import { Box } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { RouteProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { SlideTransition } from 'components/SlideTransition'

type SelectAssetProps = { onClick: (asset: Asset) => void } & RouteProps

export const SelectAsset = ({ onClick }: SelectAssetProps) => {
  // Filters the asset search to only show eth/erc20 assets
  const filterByCaip19 = (assets: Asset[]): Asset[] => {
    return assets.filter((asset: Asset) => asset.caip19.includes('eip155:1'))
  }

  return (
    <SlideTransition>
      <Box height='400px' p={0} display='flex' flexDir='column'>
        <AssetSearch onClick={onClick} filterBy={filterByCaip19} />
      </Box>
    </SlideTransition>
  )
}
