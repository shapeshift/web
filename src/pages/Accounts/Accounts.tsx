import { Flex, Stack } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { Page } from 'components/Layout/Page'
import { selectPortfolioAccountIds } from 'state/slices/portfolioSlice/portfolioSlice'

import { AccountRowWithTokens } from './AccountRowWithTokens'

export const Accounts = () => {
  const accountIds = useSelector(selectPortfolioAccountIds)
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
          {accountIds.map(accountId => (
            <AccountRowWithTokens accountId={accountId} />
          ))}
        </Stack>
      </Flex>
    </Page>
  )
}
