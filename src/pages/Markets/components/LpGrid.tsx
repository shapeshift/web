import { Grid } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useHistory } from 'react-router'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { thorchainSaversOpportunityIdsResolver } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { useAppDispatch } from 'state/store'

import { usePortalsAssetsQuery } from '../hooks/usePortalsAssetsQuery'
import { LoadingGrid } from './LoadingGrid'
import { LpGridItem } from './LpCard'

const gridTemplateColumnSx = { base: 'minmax(0, 1fr)', md: 'repeat(20, 1fr)' }
const gridTemplateRowsSx = { base: 'minmax(0, 1fr)', md: 'repeat(2, 1fr)' }

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

export const LpGrid: React.FC<{
  assetIds: AssetId[]
  selectedChainId?: ChainId
  isLoading: boolean
  limit: number
}> = ({ assetIds, selectedChainId, isLoading, limit }) => {
  const history = useHistory()
  const handleCardClick = useCallback(
    (assetId: AssetId) => {
      return history.push(`/assets/${assetId}`)
    },
    [history],
  )
  const { data: portalsAssets } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
  })

  const filteredAssetIds = useMemo(
    () =>
      (selectedChainId
        ? assetIds.filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
        : assetIds
      ).slice(0, limit),
    [assetIds, limit, selectedChainId],
  )

  if (isLoading) return <LoadingGrid />

  if (!filteredAssetIds.length)
    return <ResultsEmpty title='markets.emptyTitle' body='markets.emptyBody' icon={emptyIcon} />

  return (
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) => {
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
    </Grid>
  )
}

export const OneClickDefiAssets: React.FC<{
  selectedChainId: ChainId | undefined
  limit: number
}> = ({ limit, selectedChainId }) => {
  const { data: portalsAssets, isLoading: isPortalsAssetsLoading } = usePortalsAssetsQuery({
    chainIds: selectedChainId ? [selectedChainId] : undefined,
  })

  return (
    <LpGrid
      assetIds={portalsAssets?.ids ?? []}
      selectedChainId={selectedChainId}
      isLoading={isPortalsAssetsLoading}
      limit={limit}
    />
  )
}

export const ThorchainAssets: React.FC<{
  selectedChainId: ChainId | undefined
  limit: number
}> = ({ limit, selectedChainId }) => {
  const dispatch = useAppDispatch()
  const { data: thorchainAssetIdsData, isLoading: isThorchainAssetIdsDataLoading } = useQuery({
    queryKey: ['thorchainAssets'],
    queryFn: thorchainSaversOpportunityIdsResolver,
    staleTime: Infinity,
    select: pools => pools.data,
  })

  useEffect(() => {
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
  }, [dispatch])

  return (
    <LpGrid
      assetIds={thorchainAssetIdsData ?? []}
      selectedChainId={selectedChainId}
      isLoading={isThorchainAssetIdsDataLoading}
      limit={limit}
    />
  )
}
