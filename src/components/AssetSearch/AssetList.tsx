import { ListProps } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import * as _ from 'lodash'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useRouteMatch } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'
import { useRefCallback } from 'hooks/useRefCallback/useRefCallback'
import { selectAllMarketData, selectPortfolioAccountRows } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetRow } from './AssetRow'
import { enrichAsset } from './helpers/enrichAsset/enrichAsset'

type AssetListProps = {
  handleClick: (asset: Asset) => void
  assets: Asset[]
} & ListProps

type ItemData<T> = {
  items: Asset[]
  handleClick: T
}

export const AssetList = ({ assets, handleClick }: AssetListProps) => {
  const rowData = useSelector(selectPortfolioAccountRows)
  const marketData = useAppSelector(state => selectAllMarketData(state))
  type HandleClick = ReturnType<typeof handleClick>

  const match = useRouteMatch<{ address: string }>()
  const [tokenListRef, setTokenListRef] = useRefCallback<FixedSizeList<ItemData<HandleClick>>>({
    onInit: node => {
      if (!node) return
      const index = node.props.itemData?.items.findIndex(
        ({ tokenId: address }: Asset) => address === match.params.address,
      )
      if (typeof index === 'number' && index >= 0) {
        node.scrollToItem?.(index, 'center')
      }
    },
  })

  useEffect(() => {
    if (!tokenListRef) return
    tokenListRef?.scrollTo(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets])

  const sortByAccountAndMarketCap = (assets: Asset[]): Asset[] => {
    return _.sortBy(assets, ['fiatAmount', 'marketCap']).reverse()
  }

  const sortedAssets = sortByAccountAndMarketCap(enrichAsset(assets, rowData, marketData))

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
              items: sortedAssets,
              handleClick,
            }}
            itemCount={sortedAssets.length}
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
