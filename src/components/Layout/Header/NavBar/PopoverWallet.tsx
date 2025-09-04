import { ArrowDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { PopoverWalletHeader } from './PopoverWalletHeader'

import { Amount } from '@/components/Amount/Amount'
import { SendIcon } from '@/components/Icons/SendIcon'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { AccountTable } from '@/pages/Dashboard/components/AccountList/AccountTable'
import { WatchlistTable } from '@/pages/Home/WatchlistTable'
import {
  selectIsAnyPortfolioGetAccountLoading,
  selectPortfolioTotalUserCurrencyBalance,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

const unselectedTabStyle = { color: 'text.base' }

type PopoverWalletProps = {
  onClose?: () => void
}

export const PopoverWallet: FC<PopoverWalletProps> = memo(({ onClose }) => {
  const translate = useTranslate()
  const send = useModal('send')
  const receive = useModal('receive')
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const selectedTabBg = useColorModeValue('black', 'white')
  const selectedTabColor = useColorModeValue('white', 'black')
  const selectedTabStyle = useMemo(
    () => ({ bg: selectedTabBg, color: selectedTabColor }),
    [selectedTabBg, selectedTabColor],
  )

  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  const portfolioTotalUserCurrencyBalance = useAppSelector(selectPortfolioTotalUserCurrencyBalance)
  const isAnyPortfolioGetAccountLoading = useAppSelector(selectIsAnyPortfolioGetAccountLoading)

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
  }, [dispatch])

  return (
    <Box width='100%' height='100%' display='flex' flexDirection='column'>
      <PopoverWalletHeader
        walletInfo={walletInfo}
        isConnected={isConnected}
        connectedType={connectedType}
        onDisconnect={disconnect}
        onSwitchProvider={handleSwitchProvider}
      />
      <VStack pt={6} pb={8} spacing={1} align='center'>
        <Box position='relative'>
          <Amount.Fiat
            value={portfolioTotalUserCurrencyBalance}
            fontSize={'4xl'}
            fontWeight='bold'
            lineHeight='shorter'
          />

          {(isDiscoveringAccounts || isAnyPortfolioGetAccountLoading) && (
            <Spinner
              position='absolute'
              right={0}
              top={0}
              mr={-4}
              transform='translateY(-50%)'
              size='xs'
            />
          )}
        </Box>

        <Text color='text.subtle' whiteSpace='nowrap'>
          {translate('defi.netWorth')}
        </Text>
      </VStack>

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
            <Tab _selected={selectedTabStyle} sx={unselectedTabStyle}>
              {translate('dashboard.portfolio.myCrypto')}{' '}
            </Tab>
            <Tab _selected={selectedTabStyle} sx={unselectedTabStyle}>
              {translate('watchlist.title')}
            </Tab>
          </TabList>
          <TabPanels flex='1' overflow='auto' maxHeight={'35vh'} className='scroll-container'>
            <TabPanel p={0} pt={2}>
              <AccountTable forceCompactView onRowClick={onClose} />
            </TabPanel>
            <TabPanel p={0} pt={2}>
              <WatchlistTable forceCompactView onRowClick={onClose} hideExploreMore />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  )
})
