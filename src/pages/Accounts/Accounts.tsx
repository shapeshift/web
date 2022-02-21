import { Heading, Stack } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'
import { selectPortfolioAccountIdsSortedFiat } from 'state/slices/selectors'

import { AccountRowWithTokens } from './AccountRowWithTokens'

const AccountHeader = () => {
  return (
    <Heading pb={6}>
      <Text translation='accounts.accounts' />
    </Heading>
  )
}

export const Accounts = () => {
  const sortedAccountIds = useSelector(selectPortfolioAccountIdsSortedFiat)
  return (
    <Main titleComponent={<AccountHeader />}>
      <Stack>
        {sortedAccountIds.map(accountId => (
          <AccountRowWithTokens accountId={accountId} key={accountId} />
        ))}
      </Stack>
    </Main>
  )
}
