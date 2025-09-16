import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Skeleton,
  SkeletonCircle,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

import { DrawerSettings } from './DrawerSettings'
import { DrawerWalletHeader } from './DrawerWalletHeader'

import { AccountsListContent } from '@/components/Accounts/AccountsListContent'
import { SendIcon } from '@/components/Icons/SendIcon'
import { SettingsRoutes } from '@/components/Modals/Settings/SettingsCommon'
import { WalletBalanceChange } from '@/components/WalletBalanceChange/WalletBalanceChange'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

// Lazy-loaded tab components for better performance
const tabSpinnerStyle = { height: '200px' }

const AccountTable = lazy(() =>
  import('@/pages/Dashboard/components/AccountList/AccountTable').then(({ AccountTable }) => ({
    default: AccountTable,
  })),
)

const WatchlistTable = makeSuspenseful(
  lazy(() =>
    import('@/pages/Home/WatchlistTable').then(({ WatchlistTable }) => ({
      default: WatchlistTable,
    })),
  ),
  tabSpinnerStyle,
)

const DeFiEarn = makeSuspenseful(
  lazy(() =>
    import('@/components/StakingVaults/DeFiEarn').then(({ DeFiEarn }) => ({
      default: DeFiEarn,
    })),
  ),
  tabSpinnerStyle,
)

const TransactionHistoryContent = makeSuspenseful(
  lazy(() =>
    import('@/components/TransactionHistory/TransactionHistoryContent').then(
      ({ TransactionHistoryContent }) => ({
        default: TransactionHistoryContent,
      }),
    ),
  ),
  tabSpinnerStyle,
)

type ActionButtonProps = {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isDisabled?: boolean
}

const ActionButton: FC<ActionButtonProps> = memo(({ icon, label, onClick, isDisabled }) => {
  return (
    <Button
      flex='1'
      height='80px'
      borderRadius='xl'
      alignItems='center'
      onClick={onClick}
      isDisabled={isDisabled}
    >
      <VStack spacing={2} justify='center' align='center'>
        {icon}
        <Text fontSize='sm' fontWeight='medium' color='text.subtle'>
          {label}
        </Text>
      </VStack>
    </Button>
  )
})

const sendIcon = <SendIcon boxSize='6' color='blue.500' />
const receiveIcon = <ArrowDownIcon boxSize={6} color='green.500' />

const AccountTableSkeleton: FC = memo(() => (
  <Stack spacing={2}>
    {[1, 2, 3, 4, 5].map(index => (
      <Flex key={index} alignItems='center' py={3} px={2} borderRadius='lg' gap={4}>
        <SkeletonCircle size='10' />
        <Stack flex={1} spacing={1}>
          <Skeleton height='4' width='60%' />
          <Skeleton height='3' width='40%' />
        </Stack>
        <Stack spacing={1} alignItems='flex-end'>
          <Skeleton height='4' width='80px' />
          <Skeleton height='3' width='60px' />
        </Stack>
      </Flex>
    ))}
  </Stack>
))

const DrawerWalletInner: FC = memo(() => {
  const translate = useTranslate()
  const send = useModal('send')
  const receive = useModal('receive')
  const { isOpen, close: onClose } = useModal('walletDrawer')
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [loadedTabs, setLoadedTabs] = useState(new Set<number>())
  const navigate = useNavigate()

  const accountTableSkeletonFallback = useMemo(() => <AccountTableSkeleton />, [])

  // Defer loading the first tab until drawer opens to improve initial opening performance
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setLoadedTabs(prev => new Set([...prev, activeTabIndex]))
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen, activeTabIndex])

  const {
    state: { isConnected, walletInfo, connectedType },
    dispatch,
    disconnect,
  } = useWallet()

  const handleSendClick = useCallback(() => {
    send.open({})
  }, [send])

  const handleReceiveClick = useCallback(() => {
    receive.open({})
  }, [receive])

  const handleTabChange = useCallback((index: number) => {
    // Force immediate UI update for tab selection
    flushSync(() => {
      setActiveTabIndex(index)
    })
    // Then mark tab as loaded to trigger lazy loading
    setLoadedTabs(prev => new Set([...prev, index]))
  }, [])

  const handleSwitchProvider = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    onClose()
  }, [dispatch, onClose])

  const handleDisconnect = useCallback(() => {
    disconnect()
    onClose()
  }, [disconnect, onClose])

  const handleSettingsClick = useCallback(() => {
    navigate(SettingsRoutes.Index)
  }, [navigate])

  const handleBackToMain = useCallback(() => {
    navigate('/')
  }, [navigate])

  const drawerSettingsElement = useMemo(
    () => <DrawerSettings onBack={handleBackToMain} />,
    [handleBackToMain],
  )

  return (
    <Drawer isOpen={isOpen} placement='right' onClose={onClose} size='sm'>
      <DrawerOverlay />
      <DrawerContent width='full' maxWidth='512px'>
        <DrawerBody p={4} display='flex' flexDirection='column' height='100%'>
          <Routes>
            <Route
              path='/'
              element={
                <>
                  <DrawerWalletHeader
                    walletInfo={walletInfo}
                    isConnected={isConnected}
                    connectedType={connectedType}
                    onDisconnect={handleDisconnect}
                    onSwitchProvider={handleSwitchProvider}
                    onClose={onClose}
                    onSettingsClick={handleSettingsClick}
                  />
                  <Box pt={6} pb={8}>
                    <WalletBalanceChange showErroredAccounts={false} />
                  </Box>

                  <Flex width='100%' pb={4} gap={2}>
                    <ActionButton
                      icon={sendIcon}
                      label={translate('common.send')}
                      onClick={handleSendClick}
                      isDisabled={!isConnected}
                    />
                    <ActionButton
                      icon={receiveIcon}
                      label={translate('common.receive')}
                      onClick={handleReceiveClick}
                      isDisabled={!isConnected}
                    />
                  </Flex>

                  <Box flex='1' overflow='hidden' display='flex' flexDirection='column'>
                    <Tabs
                      index={activeTabIndex}
                      onChange={handleTabChange}
                      variant='soft-rounded'
                      size='sm'
                      isLazy
                      display='flex'
                      flexDirection='column'
                      height='100%'
                    >
                      <TabList
                        bg='transparent'
                        borderWidth={0}
                        pt={2}
                        pb={4}
                        px={0}
                        gap={2}
                        flexShrink={0}
                      >
                        <Tab>{translate('dashboard.portfolio.myCrypto')} </Tab>
                        <Tab>{translate('accounts.accounts')}</Tab>
                        <Tab>{translate('watchlist.title')}</Tab>
                        <Tab>{translate('navBar.defi')}</Tab>
                        <Tab>{translate('common.activity')}</Tab>
                      </TabList>
                      <TabPanels
                        flex='1'
                        overflow='auto'
                        maxHeight={'100%'}
                        className='scroll-container'
                      >
                        <TabPanel p={0} pt={2} pr={2} height='100%'>
                          {loadedTabs.has(0) ? (
                            <Suspense fallback={accountTableSkeletonFallback}>
                              <Box height='100%'>
                                <AccountTable forceCompactView onRowClick={onClose} />
                              </Box>
                            </Suspense>
                          ) : (
                            accountTableSkeletonFallback
                          )}
                        </TabPanel>
                        <TabPanel p={0} pt={2} pr={2}>
                          {loadedTabs.has(1) && (
                            <AccountsListContent onClose={onClose} isSimpleMenu />
                          )}
                        </TabPanel>
                        <TabPanel p={0} pt={2} pr={2}>
                          {loadedTabs.has(2) && (
                            <WatchlistTable
                              forceCompactView
                              onRowClick={onClose}
                              onExploreMore={onClose}
                            />
                          )}
                        </TabPanel>
                        <TabPanel p={0} pt={2} pr={2}>
                          {loadedTabs.has(3) && <DeFiEarn forceCompactView />}
                        </TabPanel>
                        <TabPanel p={0} pt={2} pr={2}>
                          {loadedTabs.has(4) && <TransactionHistoryContent isCompact />}
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </Box>
                </>
              }
            />
            <Route path='/settings/*' element={drawerSettingsElement} />
          </Routes>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
})

export const DrawerWallet: FC = memo(() => {
  const initialEntries = useMemo(() => ['/', ...Object.values(SettingsRoutes)], [])

  return (
    <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
      <DrawerWalletInner />
    </MemoryRouter>
  )
})
