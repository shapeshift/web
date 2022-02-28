import { Flex, Heading, useColorModeValue } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { Page } from 'components/Layout/Page'
import { Text } from 'components/Text'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { selectTxIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DownloadButton } from './DownloadButton'
import { TransactionHistoryFilter } from './TransactionHistoryFilter'
import { TransactionHistorySearch } from './TransactionHistorySearch'

export const TransactionHistory = () => {
  const txIds = useAppSelector(state => selectTxIds(state))
  return (
    <Page style={{ flex: 1 }}>
      <Flex role='main' flex={1} flexDir='column' maxWidth='6xl' mx='auto' px={4}>
        <Heading mb={4} ml={4}>
          <Text translation='transactionHistory.transactionHistory' />
        </Heading>
        <Card>
          <Card.Heading
            p={6}
            borderBottomWidth='1px'
            borderColor={useColorModeValue('gray.100', 'gray.750')}
          >
            <Flex justifyContent='space-between'>
              <Flex>
                <TransactionHistorySearch />
                <TransactionHistoryFilter />
              </Flex>
              <DownloadButton />
            </Flex>
          </Card.Heading>
          <TransactionHistoryList txIds={txIds} />
        </Card>
      </Flex>
    </Page>
  )
}
