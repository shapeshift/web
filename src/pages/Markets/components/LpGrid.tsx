import { Grid, GridItem, Skeleton } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { noop } from 'lodash'
import { useCallback, useEffect, useMemo } from 'react'
import { useHistory } from 'react-router'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { thorchainSaversOpportunityIdsResolver } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { useAppDispatch } from 'state/store'

import { usePortalsAssetsQuery } from '../hooks/usePortalsAssetsQuery'
import { AssetCard } from './AssetCard'
import { LpGridItem } from './LpCard'

const gridTemplateColumnSx = { base: 'minmax(0, 1fr)', md: 'repeat(9, 1fr)' }
const gridTemplateRowsSx = { base: 'minmax(0, 1fr)', md: 'repeat(2, 1fr)' }

const colSpanSparklineSx = { base: 1, md: 3 }
const colSpanSx = { base: 1, md: 2 }

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
      ).slice(0, limit - 1),
    [assetIds, limit, selectedChainId],
  )

  if (isLoading) {
    return (
      <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
        {new Array(8).fill(null).map((_, index) => (
          <GridItem colSpan={index === 0 ? colSpanSparklineSx : colSpanSx}>
            <Skeleton isLoaded={false}>
              <AssetCard onClick={noop} assetId={ethAssetId} />
            </Skeleton>
          </GridItem>
        ))}
      </Grid>
    )
  }

  return (
    <Grid templateRows={gridTemplateRowsSx} gridTemplateColumns={gridTemplateColumnSx} gap={4}>
      {filteredAssetIds.map((assetId, index) => {
        const maybePortalsApy = portalsAssets?.byId[assetId]?.metrics.apy
        const maybePortalsVolume = portalsAssets?.byId[assetId]?.metrics.volumeUsd1d

        return (
          <LpGridItem
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
