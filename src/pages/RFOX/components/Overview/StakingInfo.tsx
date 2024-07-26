import { Box, SimpleGrid } from '@chakra-ui/react'
import { type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { Text } from 'components/Text'
import { formatSecondsToDuration } from 'lib/utils/time'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useCurrentEpochRewardsQuery } from 'pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import { useLifetimeRewardsQuery } from 'pages/RFOX/hooks/useLifetimeRewardsQuery'
import { useTimeInPoolQuery } from 'pages/RFOX/hooks/useTimeInPoolQuery'

import { StakingInfoItem } from './StakingInfoItem'

const gridColumns = { base: 1, md: 2 }

type StakingInfoProps = {
  stakingAssetId: AssetId
  stakingAssetAccountAddress: string | undefined
  stakingBalanceCryptoBaseUnit: string | undefined
  isStakingBalanceCryptoBaseUnitLoading: boolean
}

export const StakingInfo: React.FC<StakingInfoProps> = ({
  stakingAssetId,
  stakingAssetAccountAddress,
  stakingBalanceCryptoBaseUnit,
  isStakingBalanceCryptoBaseUnitLoading,
}) => {
  const currentEpochMetadataResult = useCurrentEpochMetadataQuery()

  const timeInPoolHumanResult = useTimeInPoolQuery({
    stakingAssetAccountAddress,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  const lifetimeRewardsCryptoBaseUnitResult = useLifetimeRewardsQuery({
    stakingAssetAccountAddress,
  })

  const currentEpochRewardsCryptoBaseUnitResult = useCurrentEpochRewardsQuery({
    stakingAssetAccountAddress,
    currentEpochMetadata: currentEpochMetadataResult.data,
  })

  return (
    <Box>
      <Text mb={6} translation='RFOX.myPosition' />
      <SimpleGrid spacing={6} columns={gridColumns}>
        <StakingInfoItem
          informationDescription='RFOX.myStakedBalance'
          helperTranslation='RFOX.myStakedBalanceHelper'
          assetId={stakingAssetId}
          amountCryptoBaseUnit={stakingBalanceCryptoBaseUnit}
          isLoading={isStakingBalanceCryptoBaseUnitLoading}
        />
        <StakingInfoItem
          informationDescription='RFOX.pendingRewardsBalance'
          helperTranslation='RFOX.pendingRewardsBalanceHelper'
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={currentEpochRewardsCryptoBaseUnitResult.data?.toString()}
          isLoading={
            currentEpochRewardsCryptoBaseUnitResult.isLoading ||
            currentEpochRewardsCryptoBaseUnitResult.isPaused ||
            currentEpochRewardsCryptoBaseUnitResult.isPending
          }
        />
        <StakingInfoItem
          informationDescription='RFOX.lifetimeRewards'
          helperTranslation='RFOX.lifetimeRewardsHelper'
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={lifetimeRewardsCryptoBaseUnitResult.data?.toString()}
          isLoading={
            lifetimeRewardsCryptoBaseUnitResult.isLoading ||
            lifetimeRewardsCryptoBaseUnitResult.isPaused ||
            lifetimeRewardsCryptoBaseUnitResult.isPaused
          }
        />
        <StakingInfoItem
          informationDescription='RFOX.timeInPool'
          helperTranslation='RFOX.timeInPoolHelper'
          value={timeInPoolHumanResult.data}
          isLoading={
            timeInPoolHumanResult.isLoading ||
            timeInPoolHumanResult.isPaused ||
            timeInPoolHumanResult.isPending
          }
        />
      </SimpleGrid>
    </Box>
  )
}
