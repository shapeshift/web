import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { EmissionsPool } from './EmissionsPool'
import { StatItem } from './StatItem'
import { TotalStaked } from './TotalStaked'

import { Text } from '@/components/Text'
import { useAffiliateRevenueUsdQuery } from '@/pages/RFOX/hooks/useAffiliateRevenueUsdQuery'
import { useClosedEpochMonth } from '@/pages/RFOX/hooks/useClosedEpochMonth'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const gridColumns = { base: 1, md: 2 }

type StatsProps = {
  stakingAssetId: AssetId
}

export const Stats: React.FC<StatsProps> = ({ stakingAssetId }) => {
  const translate = useTranslate()
  const closedEpochMonth = useClosedEpochMonth()
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
          description={
            closedEpochMonth
              ? translate('RFOX.totalFeesCollectedForMonth', { month: closedEpochMonth })
              : 'RFOX.totalFeesCollected'
          }
          amountUserCurrency={totalFeesCollectedUserCurrency}
          isLoading={isLoading}
          isError={isError}
        />
        <EmissionsPool stakingAssetId={stakingAssetId} />
        <StatItem
          description={
            closedEpochMonth
              ? translate('RFOX.foxBuybackAmountForMonth', { month: closedEpochMonth })
              : 'RFOX.foxBuybackAmount'
          }
          amountUserCurrency={foxBuybackAmountUserCurrency}
          isLoading={isLoading}
          isError={isError}
        />
      </SimpleGrid>
    </Box>
  )
}
