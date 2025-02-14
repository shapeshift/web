import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useInView } from 'react-intersection-observer'
import { useHistory } from 'react-router'
import { OrderDirection } from 'components/OrderDropdown/types'
import { ResultsEmpty } from 'components/ResultsEmpty'
import type { SortOptionsKeys } from 'components/SortDropdown/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { thorchainSaversOpportunityIdsResolver } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectStakingOpportunityByFilter,
} from 'state/slices/selectors'
import { store, useAppDispatch } from 'state/store'

import { marketDataBySortKey } from '../constants'
import { usePortalsAssetsQuery } from '../hooks/usePortalsAssetsQuery'
import { LoadingGrid } from './LoadingGrid'
import { LpGridItem } from './LpCard'
import { MarketGrid } from './MarketGrid'

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

export const LpGrid: React.FC<{
  assetIds: AssetId[]
  selectedChainId?: ChainId
  isLoading: boolean
  limit: number
  orderBy?: OrderDirection
  sortBy?: SortOptionsKeys
}> = ({ assetIds, selectedChainId, isLoading, limit, orderBy, sortBy }) => {
  const { ref, inView } = useInView()
  const history = useHistory()
  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )
  const { data: portalsAssets } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
    enabled: inView,
    sortBy,
    orderBy,
    minApy: '1',
  })

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, limit),
    [assetIds, limit, selectedChainId],
  )

  const sortedAssetIds = useMemo(() => {
    if (!sortBy) return filteredAssetIds

    return filteredAssetIds.sort((a, b) => {
      const dataKey = marketDataBySortKey[sortBy]
      const firstAssetId = orderBy === OrderDirection.Ascending ? a : b
      const secondAssetId = orderBy === OrderDirection.Ascending ? b : a
      const state = store.getState()

      if (dataKey === 'apy') {
        const firstAssetOpportunityData = selectStakingOpportunityByFilter(state, {
          assetId: firstAssetId,
        })
        const secondAssetOpportunityData = selectStakingOpportunityByFilter(state, {
          assetId: secondAssetId,
        })

        if (firstAssetOpportunityData && secondAssetOpportunityData) {
          return (
            bnOrZero(firstAssetOpportunityData.apy ?? 0).toNumber() -
            bnOrZero(secondAssetOpportunityData.apy ?? 0).toNumber()
          )
        }

        // @TODO: Remove this when portals assets are accessible from the opportunities slices
        const maybePortalsFirstAssetApy = portalsAssets?.byId[firstAssetId]?.metrics.apy
        const maybePortalsSecondAssetApy = portalsAssets?.byId[secondAssetId]?.metrics.apy

        return (
          bnOrZero(maybePortalsFirstAssetApy ?? 0).toNumber() -
          bnOrZero(maybePortalsSecondAssetApy ?? 0).toNumber()
        )
      }

      const assetAMarketData = selectMarketDataByAssetIdUserCurrency(state, firstAssetId)
      const assetBMarketData = selectMarketDataByAssetIdUserCurrency(state, secondAssetId)

      return (
        bnOrZero(assetAMarketData?.[dataKey] ?? 0).toNumber() -
        bnOrZero(assetBMarketData?.[dataKey] ?? 0).toNumber()
      )
    })
  }, [filteredAssetIds, orderBy, sortBy, portalsAssets])

  if (isLoading) return <LoadingGrid />

  if (!filteredAssetIds.length)
    return <ResultsEmpty title='markets.emptyTitle' body='markets.emptyBody' icon={emptyIcon} />

  return (
    <div ref={ref}>
      <MarketGrid>
        {sortedAssetIds.map((assetId, index) => {
          const maybePortalsApy = portalsAssets?.byId[assetId]?.metrics.apy
          const maybePortalsVolume = portalsAssets?.byId[assetId]?.metrics.volumeUsd1d

          return (
            <LpGridItem
              key={assetId}
              assetId={assetId}
              index={index}
              onClick={handleCardClick}
              apy={maybePortalsApy}
              volume={maybePortalsVolume}
            />
          )
        })}
      </MarketGrid>
    </div>
  )
}

export const OneClickDefiAssets: React.FC<{
  selectedChainId: ChainId | undefined
  limit: number
  orderBy?: OrderDirection
  sortBy?: SortOptionsKeys
}> = ({ limit, selectedChainId, orderBy, sortBy }) => {
  const { ref, inView } = useInView()
  const { data: portalsAssets, isLoading: isPortalsAssetsLoading } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
    sortBy,
    orderBy,
    minApy: '1',
    enabled: inView,
  })

  return (
    <div ref={ref}>
      <LpGrid
        assetIds={portalsAssets?.ids ?? []}
        selectedChainId={selectedChainId}
        isLoading={isPortalsAssetsLoading}
        limit={limit}
        orderBy={orderBy}
        sortBy={sortBy}
      />
    </div>
  )
}

export const ThorchainAssets: React.FC<{
  selectedChainId: ChainId | undefined
  limit: number
  orderBy?: OrderDirection
  sortBy?: SortOptionsKeys
}> = ({ limit, selectedChainId, orderBy, sortBy }) => {
  const { ref, inView } = useInView()
  const dispatch = useAppDispatch()
  const { data: thorchainAssetIdsData, isLoading: isThorchainAssetIdsDataLoading } = useQuery({
    queryKey: ['thorchainAssets'],
    queryFn: inView ? thorchainSaversOpportunityIdsResolver : skipToken,
    staleTime: Infinity,
    select: pools => pools.data,
  })

  useEffect(() => {
    if (!inView) return
    ;(async () => {
      await dispatch(
        opportunitiesApi.endpoints.getOpportunityIds.initiate(
          {
            defiType: DefiType.Staking,
            defiProvider: DefiProvider.ThorchainSavers,
          },
          { forceRefetch: true },
        ),
      )

      await dispatch(
        opportunitiesApi.endpoints.getOpportunitiesMetadata.initiate(
          [
            {
              defiType: DefiType.Staking,
              defiProvider: DefiProvider.ThorchainSavers,
            },
          ],
          { forceRefetch: true },
        ),
      )
    })()
  }, [dispatch, inView])

  return (
    <div ref={ref}>
      <LpGrid
        assetIds={thorchainAssetIdsData ?? []}
        selectedChainId={selectedChainId}
        isLoading={isThorchainAssetIdsDataLoading}
        limit={limit}
        orderBy={orderBy}
        sortBy={sortBy}
      />
    </div>
  )
}
