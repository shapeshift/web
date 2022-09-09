import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectPortfolioChainIdsSortedFiat } from 'state/slices/selectors'

import { ChainRow } from './components/ChainRow'

const AccountHeader = () => {
  const isMultiAccountEnabled = useFeatureFlag('MultiAccounts')
  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center' pb={6}>
      <Heading>
        <Text translation='accounts.accounts' />
      </Heading>
      {isMultiAccountEnabled && (
        <Button leftIcon={<AddIcon />} colorScheme='blue'>
          <Text translation='accounts.addAccount' />
        </Button>
      )}
    </Stack>
  )
}

export const Accounts = () => {
  const portfolioChainIdsSortedFiat = useSelector(selectPortfolioChainIdsSortedFiat)
  const chainRows = useMemo(
    () => portfolioChainIdsSortedFiat.map(chainId => <ChainRow key={chainId} chainId={chainId} />),
    [portfolioChainIdsSortedFiat],
  )

  return (
    <Main titleComponent={<AccountHeader />}>
      <List ml={0} mt={0} spacing={4}>
        {chainRows}
      </List>
    </Main>
  )
}
