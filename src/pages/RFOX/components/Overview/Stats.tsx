import { Box, Flex, SimpleGrid } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { useAffiliateRevenueQuery } from 'pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useTotalStakedQuery } from 'pages/RFOX/hooks/useGetTotalStaked'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StatItem } from './StatItem'

const gridColumns = { base: 1, md: 2 }

type StatsProps = {
  stakingAssetId: AssetId
}

export const Stats: React.FC<StatsProps> = ({ stakingAssetId }) => {
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )

  const currentEpochMetadataResult = useCurrentEpochMetadataQuery()

  const totalStakedUserCurrencyResult = useTotalStakedQuery<string>({
    select: (totalStaked: bigint) => {
      return bn(fromBaseUnit(totalStaked.toString(), stakingAsset?.precision ?? 0))
        .times(stakingAssetMarketData.price)
        .toFixed(2)
    },
  })

  const affiliateRevenueResult = useAffiliateRevenueQuery<string>({
    startTimestamp: currentEpochMetadataResult.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataResult.data?.epochEndTimestamp,
    select: (totalRevenue: bigint) => {
      return bn(fromBaseUnit(totalRevenue.toString(), runeAsset?.precision ?? 0))
        .times(runeAssetMarketData.price)
        .toFixed(2)
    },
  })

  const emissions = useMemo(() => {
    if (!affiliateRevenueResult.data) return
    if (!currentEpochMetadataResult.data) return

    return bn(affiliateRevenueResult.data)
      .times(currentEpochMetadataResult.data.distributionRate)
      .toFixed(2)
  }, [affiliateRevenueResult.data, currentEpochMetadataResult.data])

  const burn = useMemo(() => {
    if (!affiliateRevenueResult.data) return
    if (!currentEpochMetadataResult.data) return

    return bn(affiliateRevenueResult.data)
      .times(currentEpochMetadataResult.data.burnRate)
      .toFixed(2)
  }, [affiliateRevenueResult.data, currentEpochMetadataResult.data])

  // The commented out code is a placeholder for when we have the data to display
  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' />
        {/* <Skeleton isLoaded={true} display='flex' alignItems='center'>
          <Tag colorScheme='green' size='sm' alignItems='center'>
            ~
            <Amount.Percent value={1.67} fontWeight='medium' />
          </Tag>
        </Skeleton> */}
      </Flex>

      <SimpleGrid spacing={6} columns={gridColumns}>
        <StatItem
          description='RFOX.totalStaked'
          // percentChangeDecimal={'0'}
          amountUserCurrency={totalStakedUserCurrencyResult.data}
          isLoading={totalStakedUserCurrencyResult.isLoading}
        />
        <StatItem
          description='RFOX.totalFeesCollected'
          // percentChangeDecimal={'0'}
          amountUserCurrency={affiliateRevenueResult.data}
          isLoading={affiliateRevenueResult.isLoading}
        />
        <StatItem
          description='RFOX.emissionsPool'
          helperTranslation='RFOX.emissionsPoolHelper'
          //percentChangeDecimal={'0'}
          amountUserCurrency={emissions}
          isLoading={!emissions}
        />
        <StatItem
          description='RFOX.foxBurnAmount'
          //percentChangeDecimal={'0'}
          amountUserCurrency={burn}
          isLoading={!burn}
        />
      </SimpleGrid>
    </Box>
  )
}
