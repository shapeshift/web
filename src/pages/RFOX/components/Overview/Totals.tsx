import { Box, Flex, SimpleGrid, Skeleton, Tag } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

import { TotalItem } from './TotalItem'

const gridColumns = { base: 1, md: 2 }

export const Totals: React.FC = () => {
  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' />
        <Skeleton isLoaded={true} display='flex' alignItems='center'>
          <Tag colorScheme='green' size='sm' alignItems='center'>
            ~
            <Amount.Percent value={1.67} fontWeight='medium' color='green.500' />
          </Tag>
        </Skeleton>
      </Flex>

      <SimpleGrid spacing={6} columns={gridColumns}>
        <TotalItem translation='RFOX.totalStaked' valueChange={0.0209} amountFiat='23270000' />
        <TotalItem translation='RFOX.totalFeesCollected' amountFiat='30600000' />
        <TotalItem translation='RFOX.emissionsPool' valueChange={0.3445} amountFiat='42890000' />
        <TotalItem translation='RFOX.foxBurnAmount' valueChange={0.3445} amountFiat='15820310' />
      </SimpleGrid>
    </Box>
  )
}
