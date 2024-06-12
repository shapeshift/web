import { Box, SimpleGrid } from '@chakra-ui/react'
import { rune } from 'test/mocks/assets'
import { Text } from 'components/Text'

import { StakingInformationsItem } from './StakingInformationsItem'

const gridColumns = { base: 1, md: 2 }

export const StakingInformations: React.FC = () => {
  const assetId = rune.assetId

  return (
    <Box>
      <Text mb={6} translation='RFOX.myPosition' />

      <SimpleGrid spacing={6} columns={gridColumns}>
        <StakingInformationsItem
          informationDescription='RFOX.myRewardBalance'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInformationsItem
          informationDescription='RFOX.pendingRewardBalance'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInformationsItem
          informationDescription='RFOX.lifetimeRewards'
          assetId={assetId}
          amountCryptoBaseUnit='100000000000'
        />
        <StakingInformationsItem informationDescription='RFOX.timeInPool' value='30 days' />
      </SimpleGrid>
    </Box>
  )
}
