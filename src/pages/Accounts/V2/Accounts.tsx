import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'
import { selectPortfolioChainIds } from 'state/slices/selectors'

import { ChainRow } from './components/ChainRow'

const AccountHeader = () => {
  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center' pb={6}>
      <Heading>
        <Text translation='accounts.accounts' />
      </Heading>
      <Button leftIcon={<AddIcon />} colorScheme='blue'>
        <Text translation='accounts.addAccount' />
      </Button>
    </Stack>
  )
}

export const Accounts = () => {
  // TODO(0xdef1cafe): selectPortfolioChainIdsSortedFiat
  const chainIds = useSelector(selectPortfolioChainIds)
  const chainRows = useMemo(
    () => chainIds.map(chainId => <ChainRow chainId={chainId} />),
    [chainIds],
  )
  return (
    <Main titleComponent={<AccountHeader />}>
      <List ml={0} mt={0} spacing={4}>
        {chainRows}
      </List>
    </Main>
  )
}
