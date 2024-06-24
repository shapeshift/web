import { Box, SimpleGrid } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { Text } from 'components/Text'
import { formatSecondsToDuration } from 'lib/utils/time'
import { useCurrentEpochRewardsQuery } from 'pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import { useLifetimeRewardsQuery } from 'pages/RFOX/hooks/useLifetimeRewardsQuery'
import { useTimeInPoolQuery } from 'pages/RFOX/hooks/useTimeInPoolQuery'

import { StakingInfoItem } from './StakingInfoItem'

const gridColumns = { base: 1, md: 2 }

type StakingInfoProps = {
  stakingAssetAccountAddress: string | undefined
}

export const StakingInfo: React.FC<StakingInfoProps> = ({ stakingAssetAccountAddress }) => {
  const {
    data: timeInPoolHuman,
    isLoading: isTimeInPoolHumanLoading,
    isPending: isTimeInPoolHumanPending,
    isPaused: isTimeInPoolHumanPaused,
  } = useTimeInPoolQuery({
    stakingAssetAccountAddress,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  const {
    data: lifetimeRewardsCryptoBaseUnit,
    isLoading: isLifetimeRewardsCryptoBaseUnitLoading,
    isPending: isLifetimeRewardsCryptoBaseUnitPending,
    isPaused: isLifetimeRewardsCryptoBaseUnitPaused,
  } = useLifetimeRewardsQuery({ stakingAssetAccountAddress })

  const {
    data: currentEpochRewardsCryptoBaseUnit,
    isPending: isCurrentEpochRewardsCryptoBaseUnitPending,
    isPaused: isCurrentEpochRewardsCryptoBaseUnitPaused,
    isLoading: isCurrentEpochRewardsCryptoBaseUnitLoading,
  } = useCurrentEpochRewardsQuery({ stakingAssetAccountAddress })

  return (
    <Box>
      <Text mb={6} translation='RFOX.myPosition' />

      <SimpleGrid spacing={6} columns={gridColumns}>
        <StakingInfoItem
          informationDescription='RFOX.myRewardBalance'
          helperTranslation='RFOX.myRewardBalanceHelper'
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={currentEpochRewardsCryptoBaseUnit?.toString()}
          isLoading={
            isCurrentEpochRewardsCryptoBaseUnitLoading ||
            isCurrentEpochRewardsCryptoBaseUnitPaused ||
            isCurrentEpochRewardsCryptoBaseUnitPending
          }
        />
        <StakingInfoItem
          informationDescription='RFOX.pendingRewardsBalance'
          helperTranslation='RFOX.pendingRewardsBalanceHelper'
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={currentEpochRewardsCryptoBaseUnit?.toString()}
          isLoading={
            isCurrentEpochRewardsCryptoBaseUnitLoading ||
            isCurrentEpochRewardsCryptoBaseUnitPaused ||
            isCurrentEpochRewardsCryptoBaseUnitPending
          }
        />
        <StakingInfoItem
          informationDescription='RFOX.lifetimeRewards'
          helperTranslation='RFOX.lifetimeRewardsHelper'
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={lifetimeRewardsCryptoBaseUnit?.toString()}
          isLoading={
            isLifetimeRewardsCryptoBaseUnitLoading ||
            isLifetimeRewardsCryptoBaseUnitPaused ||
            isLifetimeRewardsCryptoBaseUnitPending
          }
        />
        <StakingInfoItem
          informationDescription='RFOX.timeInPool'
          helperTranslation='RFOX.timeInPoolHelper'
          value={timeInPoolHuman}
          isLoading={
            isTimeInPoolHumanLoading || isTimeInPoolHumanPaused || isTimeInPoolHumanPending
          }
        />
      </SimpleGrid>
    </Box>
  )
}
