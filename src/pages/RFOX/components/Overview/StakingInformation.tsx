import { Box, SimpleGrid } from '@chakra-ui/react'
import { rune } from 'test/mocks/assets'
import { Text } from 'components/Text'

import { StakingInformationsItem } from './StakingInformationItem'

const gridColumns = { base: 1, md: 2 }

export const StakingInformation: React.FC = () => {
  const assetId = rune.assetId

  return (
    <Box>
      <Text mb={6} translation='RFOX.myPosition' />

      <SimpleGrid spacing={6} columns={gridColumns}>
        <StakingInformationsItem
          informationDescription='RFOX.myRewardBalance'
          helperTranslation='RFOX.myRewardBalanceHelper'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInformationsItem
          informationDescription='RFOX.pendingRewardsBalance'
          helperTranslation='RFOX.pendingRewardsBalanceHelper'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInformationsItem
          informationDescription='RFOX.lifetimeRewards'
          helperTranslation='RFOX.lifetimeRewardsHelper'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInformationsItem
          informationDescription='RFOX.timeInPool'
          helperTranslation='RFOX.timeInPoolHelper'
          value='30 days'
        />
      </SimpleGrid>
    </Box>
  )
}
