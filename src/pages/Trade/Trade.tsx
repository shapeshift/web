import { Center, Container, Stack } from '@chakra-ui/react'
import { TradeType } from '@shapeshiftoss/unchained-client'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { TransactionHistoryList } from 'components/TransactionHistory/TransactionHistoryList'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { selectTxIdsBasedOnSearchTermAndFilters } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const Trade = () => {
  const txIds = useAppSelector(state =>
    selectTxIdsBasedOnSearchTermAndFilters(state, {
      types: [TradeType.Trade],
      matchingAssets: null,
      fromDate: null,
      toDate: null,
    }),
  )
  return (
    <Main py={0} display='flex' width='full'>
      <Stack direction='row' alignSelf='stretch' flex={1} minHeight={0}>
        <Center height='100%' flex='1 1 0%' width='full'>
          <Container maxWidth='container.sm'>
            <TradeCard />
          </Container>
        </Center>
        <Stack
          flexGrow={1}
          maxWidth='380px'
          borderLeftWidth={1}
          borderColor='gray.750'
          minHeight={0}
          overflowY='auto'
        >
          <Card variant='unstyled' width='full'>
            <TransactionHistoryList txIds={txIds} useCompactMode={true} />
          </Card>
        </Stack>
      </Stack>
    </Main>
  )
}
