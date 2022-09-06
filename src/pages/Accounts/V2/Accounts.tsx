import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Stack } from '@chakra-ui/react'
import { AccountId } from '@shapeshiftoss/caip'
import { useSelector } from 'react-redux'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'
import { logger } from 'lib/logger'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectPortfolioAccountIds } from 'state/slices/selectors'

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
  const accountIds = useSelector(selectPortfolioAccountIds)
  const uniqueFeeAssetIds = Array.from(new Set(accountIds.map(accountIdToFeeAssetId)))
  return (
    <Main titleComponent={<AccountHeader />}>
      <List ml={0} mt={0} spacing={4}>
        <ChainRow title='Ethereum Mainnet' color='#627EEA' />
        <ChainRow title='Bitcoin' color='#F7931A' />
        <ChainRow title='Bitcoin Cash' color='#8DC351' />
      </List>
      {uniqueFeeAssetIds.map(assetId => (
        <AccountDropdown
          assetId={assetId}
          onChange={(accountId: AccountId) => {
            moduleLogger.trace(accountId)
          }}
        />
      ))}
    </Main>
  )
}
