import { AddIcon } from '@chakra-ui/icons'
import { Button, Container, Heading, List, Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { AccountDropdown, AccountItem } from 'components/AccountDropdown/AccountDropdown'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import { Main } from 'components/Layout/Main'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'

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

const exampleAccounts: AccountItem[] = [
  {
    name: 'USD Coin',
    cryptoBalance: '100',
    account: '0',
    symbol: 'USDC',
  },
  {
    name: 'USD Coin',
    cryptoBalance: '20',
    account: '1',
    symbol: 'USDC',
  },
]

export const Accounts = () => {
  const [activeAccount, setActiveAccount] = useState<string | null>('0')
  return (
    <Main titleComponent={<AccountHeader />}>
      <List ml={0} mt={0} spacing={4}>
        <ChainRow title='Ethereum Mainnet' color='#627EEA' />
        <ChainRow title='Bitcoin' color='#F7931A' />
        <ChainRow title='Bitcoin Cash' color='#8DC351' />
      </List>
      <AccountDropdown
        activeAccount={activeAccount}
        accounts={exampleAccounts}
        onClick={account => setActiveAccount(account)}
      />
      <Container maxW='container.sm'>
        <AssetInput
          assetSymbol='USDC'
          assetIcon='https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
          percentOptions={[1]}
          balance='1000'
        >
          <AccountDropdown
            accounts={exampleAccounts}
            activeAccount={activeAccount}
            buttonProps={{ mx: 2, mt: 2 }}
            onClick={account => setActiveAccount(account)}
          />
        </AssetInput>
        <Row>
          <Row.Label>Active Account</Row.Label>
          <Row.Value>{activeAccount}</Row.Value>
        </Row>
      </Container>
    </Main>
  )
}
