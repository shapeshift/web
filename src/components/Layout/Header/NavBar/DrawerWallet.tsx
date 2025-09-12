import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { AccountsList } from './AccountsList'
import { useDrawerWalletContext } from './DrawerWalletContext'
import { DrawerWalletHeader } from './DrawerWalletHeader'

import { SendIcon } from '@/components/Icons/SendIcon'
import { DeFiEarn } from '@/components/StakingVaults/DeFiEarn'
import { TransactionHistoryContent } from '@/components/TransactionHistory/TransactionHistoryContent'
import { WalletBalanceChange } from '@/components/WalletBalanceChange/WalletBalanceChange'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { AccountTable } from '@/pages/Dashboard/components/AccountList/AccountTable'
import { WatchlistTable } from '@/pages/Home/WatchlistTable'

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

export const DrawerWallet: FC = memo(() => {
  const translate = useTranslate()
  const send = useModal('send')
  const receive = useModal('receive')
  const [activeTabIndex, setActiveTabIndex] = useState(0)

  const { isDrawerOpen, closeDrawer } = useDrawerWalletContext()

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
    setActiveTabIndex(index)
  }, [])

  const handleSwitchProvider = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    closeDrawer()
  }, [dispatch, closeDrawer])

  return (
    <Drawer isOpen={isDrawerOpen} placement='right' onClose={closeDrawer} size='sm'>
      <DrawerOverlay />
      <DrawerContent width='512px' maxWidth='512px'>
        <DrawerBody p={4} display='flex' flexDirection='column' height='100%'>
          <DrawerWalletHeader
            walletInfo={walletInfo}
            isConnected={isConnected}
            connectedType={connectedType}
            onDisconnect={disconnect}
            onSwitchProvider={handleSwitchProvider}
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
              <TabList bg='transparent' borderWidth={0} pt={2} pb={4} px={0} gap={2} flexShrink={0}>
                <Tab>{translate('dashboard.portfolio.myCrypto')} </Tab>
                <Tab>{translate('accounts.accounts')}</Tab>
                <Tab>{translate('watchlist.title')}</Tab>
                <Tab>{translate('navBar.defi')}</Tab>
                <Tab>{translate('common.activity')}</Tab>
              </TabList>
              <TabPanels flex='1' overflow='auto' maxHeight={'100%'} className='scroll-container'>
                <TabPanel p={0} pt={2}>
                  <AccountTable forceCompactView onRowClick={closeDrawer} />
                </TabPanel>
                <TabPanel p={0} pt={2}>
                  <AccountsList onClose={closeDrawer} isSimpleMenu />
                </TabPanel>
                <TabPanel p={0} pt={2}>
                  <WatchlistTable forceCompactView onRowClick={closeDrawer} hideExploreMore />
                </TabPanel>
                <TabPanel p={0} pt={2}>
                  <DeFiEarn forceCompactView />
                </TabPanel>
                <TabPanel p={0} pt={2}>
                  <TransactionHistoryContent isCompact />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
})
