import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useCallback, useMemo } from 'react'

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

const CurrentEpochStats: React.FC<StatsProps> = ({ stakingAssetId }) => {
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const affiliateRevenueUsdQuery = useAffiliateRevenueUsdQuery({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
  })

  const totalFeesCollectedUserCurrency = useMemo(() => {
    if (affiliateRevenueUsdQuery.data === undefined) return
    return bn(affiliateRevenueUsdQuery.data).times(userCurrencyToUsdRate).toFixed(2)
  }, [affiliateRevenueUsdQuery.data, userCurrencyToUsdRate])

  const foxBuybackAmountUserCurrency = useMemo(() => {
    if (!currentEpochMetadataQuery.data) return
    if (!totalFeesCollectedUserCurrency) return

    return bn(totalFeesCollectedUserCurrency)
      .times(currentEpochMetadataQuery.data.burnRate)
      .toFixed(2)
  }, [currentEpochMetadataQuery, totalFeesCollectedUserCurrency])

  const handleRetry = useCallback(() => {
    if (
      currentEpochMetadataQuery.isError ||
      !currentEpochMetadataQuery.data?.epochStartTimestamp ||
      !currentEpochMetadataQuery.data?.epochEndTimestamp
    ) {
      void currentEpochMetadataQuery.refetch({ cancelRefetch: false })
    }
    if (affiliateRevenueUsdQuery.isError) {
      void affiliateRevenueUsdQuery.refetch({ cancelRefetch: false })
    }
  }, [currentEpochMetadataQuery, affiliateRevenueUsdQuery])

  const isError = currentEpochMetadataQuery.isError || affiliateRevenueUsdQuery.isError
  const isLoading = currentEpochMetadataQuery.isLoading || affiliateRevenueUsdQuery.isLoading

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
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
        />
        <EmissionsPool stakingAssetId={stakingAssetId} />
        <StatItem
          description='RFOX.foxBuybackAmount'
          amountUserCurrency={foxBuybackAmountUserCurrency}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
        />
      </SimpleGrid>
    </Box>
  )
}

export const Stats: React.FC<StatsProps> = ({ stakingAssetId }) => {
  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  if (!currentEpochMetadataQuery.isOutdated)
    return <CurrentEpochStats stakingAssetId={stakingAssetId} />

  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' fontWeight='bold' fontSize='xl' />
      </Flex>
      <SimpleGrid spacing={6} columns={gridColumns}>
        <TotalStaked stakingAssetId={stakingAssetId} />
        <Text translation='RFOX.epochAwaitingUpdate' color='text.subtle' />
      </SimpleGrid>
    </Box>
  )
}
