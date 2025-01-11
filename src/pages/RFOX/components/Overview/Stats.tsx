import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { RFOX_STAKING_ASSET_IDS } from 'pages/RFOX/constants'
import { useAffiliateRevenueQuery } from 'pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EmissionsPool } from './EmissionsPool'
import { StatItem } from './StatItem'
import { TotalStaked } from './TotalStaked'

const gridColumns = { base: 1, md: 2 }

export const Stats: React.FC = () => {
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const currentEpochMetadataResult = useCurrentEpochMetadataQuery()

  const affiliateRevenueResult = useAffiliateRevenueQuery<string>({
    startTimestamp: currentEpochMetadataResult.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataResult.data?.epochEndTimestamp,
  })

  const totalFeesCollectedUserCurrency = useMemo(() => {
    if (!affiliateRevenueResult.data) return

    return bn(fromBaseUnit(affiliateRevenueResult.data, runeAsset?.precision ?? 0))
      .times(runeAssetMarketData.price)
      .toFixed(2)
  }, [affiliateRevenueResult, runeAsset, runeAssetMarketData])

  const foxBurnAmountUserCurrency = useMemo(() => {
    if (!currentEpochMetadataResult.data) return
    if (!totalFeesCollectedUserCurrency) return

    return bn(totalFeesCollectedUserCurrency)
      .times(currentEpochMetadataResult.data.burnRate)
      .toFixed(2)
  }, [currentEpochMetadataResult, totalFeesCollectedUserCurrency])

  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' />
      </Flex>
      <SimpleGrid spacing={6} columns={gridColumns}>
        {RFOX_STAKING_ASSET_IDS.map(stakingAssetId => (
          <TotalStaked stakingAssetId={stakingAssetId} />
        ))}
        <StatItem
          description='RFOX.totalFeesCollected'
          amountUserCurrency={totalFeesCollectedUserCurrency}
          isLoading={affiliateRevenueResult.isLoading}
        />
        <StatItem
          description='RFOX.foxBurnAmount'
          amountUserCurrency={foxBurnAmountUserCurrency}
          isLoading={affiliateRevenueResult.isLoading || currentEpochMetadataResult.isLoading}
        />
        {RFOX_STAKING_ASSET_IDS.map(stakingAssetId => (
          <EmissionsPool stakingAssetId={stakingAssetId} />
        ))}
      </SimpleGrid>
    </Box>
  )
}
