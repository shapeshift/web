import { ListProps } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'

import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (asset: Asset) => void
  assets: Asset[]
} & ListProps

export const AssetList = ({ assets, handleClick }: AssetListProps) => {
  return assets?.length === 0 ? (
    <Text translation='common.noResultsFound' />
  ) : (
    <FixedSizeList
      itemSize={60}
      height={250}
      width='100%'
      itemData={{
        items: assets,
        handleClick
      }}
      itemCount={assets.length}
      className='token-list scroll-container'
      overscanCount={6}
    >
      {AssetRow}
    </FixedSizeList>
  )
}
