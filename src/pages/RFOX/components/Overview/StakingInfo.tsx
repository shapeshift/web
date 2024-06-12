import { Box, SimpleGrid } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { Text } from 'components/Text'

import { StakingInfoItem } from './StakingInfoItem'

const gridColumns = { base: 1, md: 2 }

export const StakingInfo: React.FC = () => {
  const assetId = thorchainAssetId

  return (
    <Box>
      <Text mb={6} translation='RFOX.myPosition' />

      <SimpleGrid spacing={6} columns={gridColumns}>
        <StakingInfoItem
          informationDescription='RFOX.myRewardBalance'
          helperTranslation='RFOX.myRewardBalanceHelper'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInfoItem
          informationDescription='RFOX.pendingRewardsBalance'
          helperTranslation='RFOX.pendingRewardsBalanceHelper'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInfoItem
          informationDescription='RFOX.lifetimeRewards'
          helperTranslation='RFOX.lifetimeRewardsHelper'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInfoItem
          informationDescription='RFOX.timeInPool'
          helperTranslation='RFOX.timeInPoolHelper'
          value='30 days'
        />
      </SimpleGrid>
    </Box>
  )
}
