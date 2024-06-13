import { Box, Flex, SimpleGrid, Skeleton, Tag } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

import { StatItem } from './StatItem'

const gridColumns = { base: 1, md: 2 }

export const Stats: React.FC = () => {
  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' />
        <Skeleton isLoaded={true} display='flex' alignItems='center'>
          <Tag colorScheme='green' size='sm' alignItems='center'>
            ~
            <Amount.Percent value={1.67} fontWeight='medium' />
          </Tag>
        </Skeleton>
      </Flex>

      <SimpleGrid spacing={6} columns={gridColumns}>
        <StatItem
          description='RFOX.totalStaked'
          percentChangeDecimal={'0.0209'}
          amountUserCurrency='23270000'
        />
        <StatItem description='RFOX.totalFeesCollected' amountUserCurrency='30600000' />
        <StatItem
          description='RFOX.emissionsPool'
          helperTranslation='RFOX.emissionsPoolHelper'
          percentChangeDecimal={'0.3445'}
          amountUserCurrency='42890000'
        />
        <StatItem
          description='RFOX.foxBurnAmount'
          percentChangeDecimal={'0.3445'}
          amountUserCurrency='15820310'
        />
      </SimpleGrid>
    </Box>
  )
}
