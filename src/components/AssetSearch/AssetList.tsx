import { ListProps } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/asset-service'
import { useRouteMatch } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'
import { useRefCallback } from 'hooks/useRefCallback/useRefCallback'

import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (asset: Asset) => void
  assets: Asset[]
} & ListProps

export const AssetList = ({ assets, handleClick }: AssetListProps) => {
  const match = useRouteMatch<{ address: string }>()
  const [tokenListRef] = useRefCallback<FixedSizeList>({
    onInit: node => {
      const index = node.props.itemData.items.findIndex(
        ({ tokenId: address }: Asset) => address === match.params.address
      )
      node.scrollToItem?.(index, 'center')
    }
  })

  return (
    <AutoSizer disableWidth className='auto-sizered'>
      {({ height }) =>
        assets?.length === 0 ? (
          <Text translation='common.noResultsFound' />
        ) : (
          <FixedSizeList
            itemSize={60}
            height={height}
            width='100%'
            itemData={{
              items: assets,
              handleClick
            }}
            itemCount={assets.length}
            ref={tokenListRef}
            className='token-list scroll-container'
            overscanCount={6}
          >
            {AssetRow}
          </FixedSizeList>
        )
      }
    </AutoSizer>
  )
}
