import { Box } from '@chakra-ui/react'
import { caip2 } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { RouteProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { SlideTransition } from 'components/SlideTransition'

type SelectAssetProps = { onClick: (asset: Asset) => void } & RouteProps

export const SelectAsset = ({ onClick }: SelectAssetProps) => {
  // Filters the asset search to only show eth/erc20 assets
  const ethCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  const filterByCaip19 = (assets: Asset[]): Asset[] => {
    return assets.filter(
      ({ chain, network }: Asset) => caip2.toCAIP2({ chain, network }) === ethCAIP2
    )
  }

  return (
    <SlideTransition>
      <Box height='400px' p={0} display='flex' flexDir='column'>
        <AssetSearch onClick={onClick} filterBy={filterByCaip19} />
      </Box>
    </SlideTransition>
  )
}
