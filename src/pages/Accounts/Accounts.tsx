import { EditIcon } from '@chakra-ui/icons'
import { Button, Heading, Skeleton, Stack } from '@chakra-ui/react'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Navigate, Route, Routes } from 'react-router-dom'

import { Account } from './Account'

import { AccountsListContent } from '@/components/Accounts/AccountsListContent'
import { Display } from '@/components/Display'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { DashboardHeader } from '@/pages/Dashboard/components/DashboardHeader/DashboardHeader'
import { selectIsPortfolioLoading, selectWalletId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const editIcon = <EditIcon />
const pxProps = { base: 4, xl: 0 }
const mainPadding = { base: 0, md: 4 }
const dashboardHeader = <DashboardHeader />

const AccountHeader = ({ isLoading }: { isLoading?: boolean }) => {
  const translate = useTranslate()
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

  const { open: openManageAccountsModal } = useModal('manageAccounts')

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
  const loading = useSelector(selectIsPortfolioLoading)

  return (
    <>
      <AccountHeader isLoading={loading} />
      <AccountsListContent />
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

  const mobileRoutes = useMemo(
    () => (
      <Routes>
        <Route path='/' element={accountsContentElement} />
        <Route path=':accountId/*' element={accountElement} />
      </Routes>
    ),
    [accountElement, accountsContentElement],
  )

  const desktopRoutes = useMemo(
    () => (
      <Routes>
        <Route path='/' element={<Navigate to='/trade' replace />} />
        <Route path=':accountId/*' element={accountElement} />
      </Routes>
    ),
    [accountElement],
  )

  return (
    <>
      <Display.Desktop>
        <Main headerComponent={dashboardHeader} py={mainPadding}>
          {desktopRoutes}
        </Main>
      </Display.Desktop>
      <Display.Mobile>{mobileRoutes}</Display.Mobile>
    </>
  )
}
