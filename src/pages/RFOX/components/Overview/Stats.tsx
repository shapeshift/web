import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'

import { EmissionsPool } from './EmissionsPool'
import { StatItem } from './StatItem'
import { TotalStaked } from './TotalStaked'

import { Text } from '@/components/Text'
import { useAffiliateRevenueUsdQuery } from '@/pages/RFOX/hooks/useAffiliateRevenueUsdQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { supportedStakingAssetIds } from '@/pages/RFOX/hooks/useRfoxContext'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const gridColumns = { base: 1, md: 2 }

export const Stats: React.FC = () => {
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const affiliateRevenueUsdQuery = useAffiliateRevenueUsdQuery({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
  })

  const totalFeesCollectedUserCurrency = useMemo(() => {
    if (!affiliateRevenueUsdQuery.data) return
    return bn(affiliateRevenueUsdQuery.data).times(userCurrencyToUsdRate).toFixed(2)
  }, [affiliateRevenueUsdQuery.data, userCurrencyToUsdRate])

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
  }, [])

  const Emissions = useMemo(() => {
    return supportedStakingAssetIds.map(stakingAssetId => (
      <EmissionsPool stakingAssetId={stakingAssetId} />
    ))
  }, [])

  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' fontWeight='bold' fontSize='xl' />
      </Flex>
      <SimpleGrid spacing={6} columns={gridColumns}>
        {Staked}
        <StatItem
          description='RFOX.totalFeesCollected'
          amountUserCurrency={totalFeesCollectedUserCurrency}
          isLoading={affiliateRevenueUsdQuery.isLoading}
        />
        <StatItem
          description='RFOX.foxBurnAmount'
          amountUserCurrency={foxBurnAmountUserCurrency}
          isLoading={affiliateRevenueUsdQuery.isLoading || currentEpochMetadataQuery.isLoading}
        />
        {Emissions}
      </SimpleGrid>
    </Box>
  )
}
