import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Stack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route, Switch, useRouteMatch } from 'react-router'
import { SEO } from 'components/Layout/Seo'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectPortfolioChainIdsSortedUserCurrency } from 'state/slices/selectors'

import { Account } from './Account'
import { ChainRow } from './components/ChainRow'

const AccountHeader = () => {
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()
  const [isMultiAccountWallet, setIsMultiAccountWallet] = useState<boolean>(false)

  useEffect(() => {
    if (!wallet) return
    setIsMultiAccountWallet(wallet.supportsBip44Accounts())
  }, [wallet])

  const { open } = useModal('addAccount')

  return (
    <Stack
      px={{ base: 4, xl: 0 }}
      direction='row'
      justifyContent='space-between'
      alignItems='center'
      pb={6}
    >
      <SEO title={translate('accounts.accounts')} />
      <Heading fontSize='xl'>
        <Text translation='accounts.accounts' />
      </Heading>
      {isMultiAccountWallet && (
        <Button
          loadingText={translate('accounts.addAccount')}
          leftIcon={<AddIcon />}
          colorScheme='blue'
          onClick={open}
          size='sm'
          data-test='add-account-button'
        >
          <Text translation='accounts.addAccount' />
        </Button>
      )}
    </Stack>
  )
}

export const Accounts = () => {
  const { path } = useRouteMatch()
  const portfolioChainIdsSortedUserCurrency = useSelector(selectPortfolioChainIdsSortedUserCurrency)
  const chainRows = useMemo(
    () =>
      portfolioChainIdsSortedUserCurrency.map(chainId => (
        <ChainRow key={chainId} chainId={chainId} />
      )),
    [portfolioChainIdsSortedUserCurrency],
  )

  return (
    <Switch>
      <Route exact path={`${path}/`}>
        <AccountHeader />
        <List ml={0} mt={0} spacing={4}>
          {chainRows}
        </List>
      </Route>
      <Route path={`${path}/:accountId`}>
        <Account />
      </Route>
    </Switch>
  )
}
