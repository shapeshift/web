import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { useAffiliateRevenueQuery } from 'pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EmissionsPool } from './EmissionsPool'
import { StatItem } from './StatItem'
import { TotalStaked } from './TotalStaked'

const gridColumns = { base: 1, md: 2 }

export const Stats: React.FC = () => {
  const { supportedStakingAssetIds } = useRFOXContext()

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const affiliateRevenueQuery = useAffiliateRevenueQuery<string>({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
  })

  const totalFeesCollectedUserCurrency = useMemo(() => {
    if (!affiliateRevenueQuery.data) return

    return bn(fromBaseUnit(affiliateRevenueQuery.data, runeAsset?.precision ?? 0))
      .times(runeAssetMarketData.price)
      .toFixed(2)
  }, [affiliateRevenueQuery, runeAsset, runeAssetMarketData])

  const foxBurnAmountUserCurrency = useMemo(() => {
    if (!currentEpochMetadataQuery.data) return
    if (!totalFeesCollectedUserCurrency) return

    return bn(totalFeesCollectedUserCurrency)
      .times(currentEpochMetadataQuery.data.burnRate)
      .toFixed(2)
  }, [currentEpochMetadataQuery, totalFeesCollectedUserCurrency])

  const Staked = useMemo(() => {
    return supportedStakingAssetIds.map(stakingAssetId => (
      <TotalStaked stakingAssetId={stakingAssetId} />
    ))
  }, [supportedStakingAssetIds])

  const Emissions = useMemo(() => {
    return supportedStakingAssetIds.map(stakingAssetId => (
      <EmissionsPool stakingAssetId={stakingAssetId} />
    ))
  }, [supportedStakingAssetIds])

  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' />
      </Flex>
      <SimpleGrid spacing={6} columns={gridColumns}>
        {Staked}
        <StatItem
          description='RFOX.totalFeesCollected'
          amountUserCurrency={totalFeesCollectedUserCurrency}
          isLoading={affiliateRevenueQuery.isLoading}
        />
        <StatItem
          description='RFOX.foxBurnAmount'
          amountUserCurrency={foxBurnAmountUserCurrency}
          isLoading={affiliateRevenueQuery.isLoading || currentEpochMetadataQuery.isLoading}
        />
        {Emissions}
      </SimpleGrid>
    </Box>
  )
}
