import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'

import { EmissionsPool } from './EmissionsPool'
import { StatItem } from './StatItem'
import { TotalStaked } from './TotalStaked'

import { Text } from '@/components/Text'
import { useAffiliateRevenueUsdQuery } from '@/pages/RFOX/hooks/useAffiliateRevenueUsdQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const gridColumns = { base: 1, md: 2 }

type StatsProps = {
  stakingAssetId: AssetId
}

export const Stats: React.FC<StatsProps> = ({ stakingAssetId }) => {
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

  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' fontWeight='bold' fontSize='xl' />
      </Flex>
      <SimpleGrid spacing={6} columns={gridColumns}>
        <TotalStaked stakingAssetId={stakingAssetId} />
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
        <EmissionsPool stakingAssetId={stakingAssetId} />
      </SimpleGrid>
    </Box>
  )
}
