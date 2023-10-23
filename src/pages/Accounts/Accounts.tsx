import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Skeleton, Stack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route, Switch, useRouteMatch } from 'react-router'
import { SEO } from 'components/Layout/Seo'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectPortfolioChainIdsSortedUserCurrency,
  selectPortfolioLoading,
  selectWalletId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Account } from './Account'
import { ChainRow } from './components/ChainRow'

const addIcon = <AddIcon />
const pxProps = { base: 4, xl: 0 }

const AccountHeader = ({ isLoading }: { isLoading?: boolean }) => {
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
    <Stack px={pxProps} direction='row' justifyContent='space-between' alignItems='center' pb={6}>
      <SEO title={translate('accounts.accounts')} />
      <Skeleton isLoaded={!isLoading}>
        <Heading fontSize='xl'>
          <Text translation='accounts.accounts' />
        </Heading>
      </Skeleton>
      {isMultiAccountWallet && (
        <Skeleton isLoaded={!isLoading}>
          <Button
            loadingText={translate('accounts.addAccount')}
            leftIcon={addIcon}
            colorScheme='blue'
            onClick={open}
            size='sm'
            data-test='add-account-button'
          >
            <Text translation='accounts.addAccount' />
          </Button>
        </Skeleton>
      )}
    </Stack>
  )
}

export const Accounts = () => {
  const { path } = useRouteMatch()
  const blanks = Array(4).fill(0)
  const loading = useSelector(selectPortfolioLoading)
  const portfolioChainIdsSortedUserCurrency = useSelector(selectPortfolioChainIdsSortedUserCurrency)
  const chainRows = useMemo(
    () =>
      portfolioChainIdsSortedUserCurrency.map(chainId => (
        <ChainRow key={chainId} chainId={chainId} />
      )),
    [portfolioChainIdsSortedUserCurrency],
  )

  const walletId = useAppSelector(selectWalletId)

  const blankRows = useMemo(() => {
    return blanks.map(index => (
      <Skeleton key={`chain-${index}`} height='82px' width='full' borderRadius='2xl' />
    ))
  }, [blanks])

  const renderRows = useMemo(() => {
    return loading ? blankRows : chainRows
  }, [blankRows, chainRows, loading])

  return (
    <Switch>
      <Route exact path={`${path}/`} key={`${walletId}-${loading}`}>
        <AccountHeader isLoading={loading} />
        <List ml={0} mt={0} spacing={4}>
          {renderRows}
        </List>
      </Route>
      <Route path={`${path}/:accountId`}>
        <Account />
      </Route>
    </Switch>
  )
}
