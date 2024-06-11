import { Box, SimpleGrid } from '@chakra-ui/react'
import { rune } from 'test/mocks/assets'
import { Text } from 'components/Text'

import { PositionItem } from './PositionItem'

const gridColumns = { base: 1, md: 2 }

export const Positions: React.FC = () => {
  return (
    <Box>
      <Text mb={6} translation='RFOX.myPosition' />

      <SimpleGrid spacing={6} columns={gridColumns}>
        <PositionItem
          translation='RFOX.myRewardBalance'
          asset={rune}
          amountCryptoBaseUnit='1000'
          amountFiat='10'
        />
        <PositionItem
          translation='RFOX.pendingRewardBalance'
          asset={rune}
          amountCryptoBaseUnit='1000'
          amountFiat='10'
        />
        <PositionItem
          translation='RFOX.lifetimeRewards'
          asset={rune}
          amountCryptoBaseUnit='1000'
          amountFiat='10'
        />
        <PositionItem translation='RFOX.timeInPool' text='30 days' />
      </SimpleGrid>
    </Box>
  )
}
