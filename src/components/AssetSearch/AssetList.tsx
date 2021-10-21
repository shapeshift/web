import { ListProps } from '@chakra-ui/react'
import { assetService } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useRouteMatch } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'
import { useRefCallback } from 'hooks/useRefCallback/useRefCallback'

import { AssetRow } from './AssetRow'

type AssetListProps = {
  handleClick: (asset: assetService.Asset) => void
  assets: assetService.Asset[]
} & ListProps

type ItemData<T> = {
  items: assetService.Asset[]
  handleClick: T
}

export const AssetList = ({ assets, handleClick }: AssetListProps) => {
  type HandleClick = ReturnType<typeof handleClick>

  const match = useRouteMatch<{ address: string }>()
  const [tokenListRef, setTokenListRef] = useRefCallback<FixedSizeList<ItemData<HandleClick>>>({
    onInit: node => {
      if (!node) return
      const index = node.props.itemData?.items.findIndex(
        ({ tokenId: address }: assetService.Asset) => address === match.params.address
      )
      if (typeof index === 'number' && index >= 0) {
        node.scrollToItem?.(index, 'center')
      }
    }
  })

  useEffect(() => {
    if (!tokenListRef) return
    tokenListRef?.scrollTo(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets])

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
            ref={setTokenListRef}
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
