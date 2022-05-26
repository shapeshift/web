import { ListProps } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
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

type AssetListProps = {
  handleClick: (asset: Asset) => void
  assets: Asset[]
} & ListProps

type ItemData<T> = {
  items: Asset[]
  handleClick: T
}

type EnrichAsset = { cryptoAmount: number; marketCap: number } & Asset

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

  /**
   * This function enrich the Asset by adding the user cryptoAmount and marketCap for each asset for facilitate sorting.
   * @param assets Asset[]
   * @returns
   */
  const enrichAsset = (assets: Asset[]): Asset[] => {
    return assets.map(asset => {
      const amount = rowData.find(d => d.assetId === asset.caip19)?.cryptoAmount
      const assetMarketData = marketData.byId[asset.caip19]
      return {
        ...asset,
        cryptoAmount: amount ? Number(amount) : 0,
        marketCap: assetMarketData ? Number(assetMarketData.marketCap) : 0
      } as Asset
    })
  }

  const sortByAccountAndMarketCap = (assets: Asset[]): Asset[] => {
    return assets.sort((a, b) => {
      const first = a as EnrichAsset
      const second = b as EnrichAsset
      return second.cryptoAmount - first.cryptoAmount || second.marketCap - first.marketCap
    })
  }

  const sortedAssets = sortByAccountAndMarketCap(enrichAsset(assets))

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
              handleClick
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
