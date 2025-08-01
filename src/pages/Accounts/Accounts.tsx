import { AddIcon, EditIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Skeleton, Stack } from '@chakra-ui/react'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route, Routes } from 'react-router-dom'

import { Account } from './Account'
import { ChainRow } from './components/ChainRow'

import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  selectIsAnyMarketDataApiQueryPending,
  selectIsPortfolioLoading,
  selectWalletConnectedChainIds,
  selectWalletConnectedChainIdsSorted,
  selectWalletId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const addIcon = <AddIcon />
const editIcon = <EditIcon />
const pxProps = { base: 4, xl: 0 }

const AccountHeader = ({ isLoading }: { isLoading?: boolean }) => {
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const {
    state: { wallet },
  } = useWallet()
  const [isMultiAccountWallet, setIsMultiAccountWallet] = useState<boolean>(false)

  const isSnapInstalled = useIsSnapInstalled()
  const isMetaMaskMultichainWallet = wallet instanceof MetaMaskMultiChainHDWallet
  useEffect(() => {
    if (!wallet) return
    if (isMetaMaskMultichainWallet && !isSnapInstalled) return setIsMultiAccountWallet(false)

    setIsMultiAccountWallet(wallet.supportsBip44Accounts())
  }, [isMetaMaskMultichainWallet, isSnapInstalled, wallet])

  const { open: openAddAccountModal } = useModal('addAccount')
  const { open: openManageAccountsModal } = useModal('manageAccounts')

  return (
    <Stack px={pxProps} direction='row' justifyContent='space-between' alignItems='center' pb={6}>
      <SEO title={translate('accounts.accounts')} />
      <Skeleton isLoaded={!isLoading}>
        <Heading fontSize='xl'>
          <Text translation='accounts.accounts' />
        </Heading>
      </Skeleton>
      {!isAccountManagementEnabled && isMultiAccountWallet && (
        <Skeleton isLoaded={!isLoading}>
          <Button
            loadingText={translate('accounts.addAccount')}
            leftIcon={addIcon}
            colorScheme='blue'
            onClick={openAddAccountModal}
            size='sm'
            data-test='add-account-button'
          >
            <Text translation='accounts.addAccount' />
          </Button>
        </Skeleton>
      )}
      {isAccountManagementEnabled && isMultiAccountWallet && (
        <Skeleton isLoaded={!isLoading}>
          <Button
            loadingText={translate('accountManagement.menuTitle')}
            leftIcon={editIcon}
            colorScheme='blue'
            onClick={openManageAccountsModal}
            size='sm'
            data-test='manage-accounts-button'
          >
            <Text translation='accountManagement.menuTitle' />
          </Button>
        </Skeleton>
      )}
    </Stack>
  )
}

const AccountsContent = () => {
  const blanks = Array(4).fill(0)
  const loading = useSelector(selectIsPortfolioLoading)
  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()
  const isAnyMarketDataLoading = useAppSelector(selectIsAnyMarketDataApiQueryPending)

  // Don't use user-currency sorting until we're fully loaded - else this will keep on re-rendering forever and will
  // both look janky (lots of reordering) and most importantly, barely usable
  const portfolioChainIdsSortedUserCurrency = useAppSelector(state =>
    isDiscoveringAccounts || isAnyMarketDataLoading
      ? selectWalletConnectedChainIds(state)
      : selectWalletConnectedChainIdsSorted(state),
  )
  const chainRows = useMemo(
    () =>
      portfolioChainIdsSortedUserCurrency.map(chainId => (
        <ChainRow key={chainId} chainId={chainId} />
      )),
    [portfolioChainIdsSortedUserCurrency],
  )

  const blankRows = useMemo(() => {
    return blanks.map(index => (
      <Skeleton key={`chain-${index}`} height='82px' width='full' borderRadius='2xl' />
    ))
  }, [blanks])

  const renderRows = useMemo(() => {
    return loading ? blankRows : chainRows
  }, [blankRows, chainRows, loading])

  return (
    <>
      <AccountHeader isLoading={loading} />
      <List ml={0} mt={0} spacing={4}>
        {renderRows}
      </List>
    </>
  )
}

export const Accounts = () => {
  const loading = useSelector(selectIsPortfolioLoading)
  const walletId = useAppSelector(selectWalletId)

  const accountsContentElement = useMemo(
    () => <AccountsContent key={`${walletId}-${loading}`} />,
    [walletId, loading],
  )

  const accountElement = useMemo(() => <Account />, [])

  return (
    <Routes>
      <Route path='/' element={accountsContentElement} />
      <Route path=':accountId/*' element={accountElement} />
    </Routes>
  )
}
