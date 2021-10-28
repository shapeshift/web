import { Box } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { RouteProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { SlideTransition } from 'components/SlideTransition'

type SelectAssetProps = { onClick: (asset: Asset) => void } & RouteProps

export const SelectAsset = ({ onClick }: SelectAssetProps) => {
  useEffect(() => {
    console.log('render')
  }, [])
  return (
    <SlideTransition>
      <Box height='400px' p={0} display='flex' flexDir='column'>
        <AssetSearch onClick={onClick} />
      </Box>
    </SlideTransition>
  )
}
