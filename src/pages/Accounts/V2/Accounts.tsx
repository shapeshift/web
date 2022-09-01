import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Stack } from '@chakra-ui/react'
import { AccountId, btcAssetId, cosmosAssetId, ethAssetId } from '@shapeshiftoss/caip'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'
import { logger } from 'lib/logger'

import { ChainRow } from './components/ChainRow'

const moduleLogger = logger.child({ namespace: ['AccountsV2'] })

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
  return (
    <Main titleComponent={<AccountHeader />}>
      <List ml={0} mt={0} spacing={4}>
        <ChainRow title='Ethereum Mainnet' color='#627EEA' />
        <ChainRow title='Bitcoin' color='#F7931A' />
        <ChainRow title='Bitcoin Cash' color='#8DC351' />
      </List>
      <AccountDropdown
        assetId={btcAssetId}
        onChange={(accountId: AccountId) => {
          moduleLogger.trace(accountId)
        }}
      />
      <AccountDropdown
        assetId={ethAssetId}
        onChange={(accountId: AccountId) => {
          moduleLogger.trace(accountId)
        }}
      />
      <AccountDropdown
        assetId={cosmosAssetId}
        onChange={(accountId: AccountId) => {
          moduleLogger.trace(accountId)
        }}
      />
    </Main>
  )
}
