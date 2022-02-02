import { Flex, Heading, Stack } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import { Page } from 'components/Layout/Page'
import { Text } from 'components/Text'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { selectPortfolioAccountIdsSortedFiat } from 'state/slices/portfolioSlice/selectors'

import { AccountRowWithTokens } from './AccountRowWithTokens'

export const Accounts = () => {
  const sortedAccountIds = useSelector(selectPortfolioAccountIdsSortedFiat)
  const {
    state: { isConnected }
  } = useWallet()

  const history = useHistory()

  useEffect(() => {
    if (!isConnected) history.goBack()
  }, [history, isConnected])

  return (
    <Page style={{ flex: 1 }}>
      <Flex
        role='main'
        flex={1}
        flexDir='column'
        maxWidth='2xl'
        mx='auto'
        height={{ base: 'calc(100vh - 128px)', md: 'calc(100vh - 64px)' }}
        px={4}
      >
        <Stack>
          <Heading>
            <Text translation='accounts.accounts' />
          </Heading>
          {isConnected &&
            sortedAccountIds.map(accountId => (
              <AccountRowWithTokens accountId={accountId} key={accountId} />
            ))}
        </Stack>
      </Flex>
    </Page>
  )
}
