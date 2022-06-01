import { ListProps } from '@chakra-ui/react'
import { Asset, MarketData } from '@shapeshiftoss/types'
import sortBy from 'lodash/sortBy'
import { useEffect, useMemo } from 'react'
import { useRouteMatch } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'components/Text'
import { useRefCallback } from 'hooks/useRefCallback/useRefCallback'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { AccountRowData } from 'state/slices/portfolioSlice/selectors'
import { selectMarketData, selectPortfolioAccountRows } from 'state/slices/selectors'
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

type EnrichData = Record<string, { fiatAmount: string; cryptoAmount: string; marketCap: string }>

/**
 * This function allow to sort the asset by the fiatAmount firstly and the marketcap secondly.
 * @param assets
 * @param enrichData
 * @returns
 */
const sortAssetsByAccountAndMarketCap = (assets: Asset[], enrichData: EnrichData): Asset[] =>
  sortBy(assets, [
    asset => bnOrZero(enrichData[asset.assetId].fiatAmount).toNumber(),
    asset => bnOrZero(enrichData[asset.assetId].marketCap).toNumber(),
  ]).reverse()

/**
 * This function create a data object(cryptoAmount, fiatAmount, marketCap) from the Asset, portfolioAcountRows and marketData for each asset for facilitate sorting.
 * @param assets
 * @param portfolioAcountRows
 * @param marketData
 * @returns EnrichData
 */
export const createEnrichData = (
  assets: Asset[],
  portfolioAcountRows: AccountRowData[],
  marketData: {
    [x: string]: MarketData | undefined
  },
): EnrichData => {
  const result: EnrichData = {}
  assets.forEach(asset => {
    const fiatAmount = portfolioAcountRows.find(
      portfolioAccountRow => portfolioAccountRow.assetId === asset.assetId,
    )?.fiatAmount

    const cryptoAmount = portfolioAcountRows.find(
      portfolioAccountRow => portfolioAccountRow.assetId === asset.assetId,
    )?.cryptoAmount

    const assetMarketData = marketData[asset.assetId]

    result[asset.assetId] = {
      fiatAmount: bnOrZero(fiatAmount).toString(),
      cryptoAmount: bnOrZero(cryptoAmount).toString(),
      marketCap: bnOrZero(assetMarketData?.marketCap).toString(),
    }
  })
  return result
}

export const AssetList = ({ assets, handleClick }: AssetListProps) => {
  const portfolioAcountRows = useAppSelector(state => selectPortfolioAccountRows(state))
  const marketData = useAppSelector(state => selectMarketData(state))
  const enrichData = useMemo(
    () => createEnrichData(assets, portfolioAcountRows, marketData),
    [assets, marketData, portfolioAcountRows],
  )

  const sortedAssets = useMemo(
    () => sortAssetsByAccountAndMarketCap(assets, enrichData),
    [assets, enrichData],
  )

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
