import { ChevronDownIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import { Button, ButtonGroup, Flex, HStack, IconButton, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useEnsName } from 'wagmi'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
// import { WalletConnectedMenu } from 'components/Layout/Header/NavBar/WalletConnectedMenu'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import type { InitialState } from 'context/WalletProvider/WalletProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { WalletConnectedMenu } from './WalletConnectedMenu'

export const entries = [WalletConnectedRoutes.Connected]

const NoWallet = ({ onClick }: { onClick: () => void }) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.noWallet')} ml={3} color='gray.500'>
      <MenuItem onClick={onClick} alignItems='center' justifyContent='space-between'>
        {translate('common.connectWallet')}
        <ChevronDownIcon />
      </MenuItem>
    </MenuGroup>
  )
}

export type WalletConnectedProps = {
  onDisconnect: () => void
} & Pick<InitialState, 'walletInfo' | 'isConnected' | 'type'>

export const WalletConnected = (props: WalletConnectedProps) => {
  return (
    <MemoryRouter initialEntries={entries}>
      <Switch>
        <Route path='/'>
          <WalletConnectedMenu
            isConnected={props.isConnected}
            walletInfo={props.walletInfo}
            onDisconnect={props.onDisconnect}
            type={props.type}
          />
        </Route>
      </Switch>
    </MemoryRouter>
  )
}

type WalletButtonProps = {
  isConnected: boolean
  isDemoWallet: boolean
  isLoadingLocalWallet: boolean
  onConnect: () => void
  deviceBusy: boolean
} & Pick<InitialState, 'walletInfo'>

const WalletButton: FC<WalletButtonProps> = ({
  isConnected,
  isDemoWallet,
  walletInfo,
  onConnect,
  isLoadingLocalWallet,
  deviceBusy,
}) => {
  const [walletLabel, setWalletLabel] = useState('')
  const [shouldShorten, setShouldShorten] = useState(true)
  const bgColor = useColorModeValue('gray.300', 'gray.800')

  const {
    data: ensName,
    isSuccess: isEnsNameLoaded,
    isLoading: isEnsNameLoading,
  } = useEnsName({
    address: walletInfo?.meta?.address,
    cacheTime: Infinity, // Cache a given ENS reverse resolution response infinitely for the lifetime of a tab / until app reload
    staleTime: Infinity, // Cache a given ENS reverse resolution query infinitely for the lifetime of a tab / until app reload
  })

  useEffect(() => {
    ;(async () => {
      setWalletLabel('')
      setShouldShorten(true)
      if (!walletInfo || !walletInfo.meta || isEnsNameLoading) return setWalletLabel('')
      // Wallet has a native label, we don't care about ENS name here
      if (!walletInfo?.meta?.address && walletInfo.meta.label) {
        setShouldShorten(false)
        return setWalletLabel(walletInfo.meta.label)
      }

      // ENS successfully fetched. Set ENS name as label
      if (isEnsNameLoaded && ensName) {
        setShouldShorten(false)
        return setWalletLabel(ensName!)
      }

      // No label or ENS name, set regular wallet address as label
      return setWalletLabel(walletInfo?.meta?.address ?? '')
    })()
  }, [ensName, isEnsNameLoading, isEnsNameLoaded, walletInfo])

  return Boolean(walletInfo?.deviceId) || isLoadingLocalWallet ? (
    <Button
      width={{ base: '100%', lg: 'auto' }}
      justifyContent='flex-start'
      variant='outline'
      isLoading={isLoadingLocalWallet}
      leftIcon={
        <HStack>
          {!(isConnected || isDemoWallet) && (
            <WarningTwoIcon ml={2} w={3} h={3} color='yellow.500' />
          )}
          <WalletImage walletInfo={walletInfo} />
        </HStack>
      }
    >
      <Flex>
        {walletLabel ? (
          <MiddleEllipsis
            rounded='lg'
            fontSize='sm'
            p='1'
            pl='2'
            pr='2'
            shouldShorten={shouldShorten}
            bgColor={bgColor}
            value={`${walletLabel} ${deviceBusy ? '- Busy' : ''}`}
          />
        ) : (
          <RawText>
            sadfsdfasdfasdfsadfasdffdsa
            {walletInfo?.name}
          </RawText>
        )}
      </Flex>
    </Button>
  ) : (
    <Button onClick={onConnect} leftIcon={<FaWallet />}>
      <Text translation='common.connectWallet' />
    </Button>
  )
}

export const UserMenu: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { state, dispatch, disconnect, deviceBusy } = useWallet()
  const { isConnected, isDemoWallet, walletInfo, isLocked, type } = state

  if (isLocked) disconnect()
  const hasWallet = Boolean(walletInfo?.deviceId)
  const handleConnect = () => {
    onClick && onClick()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }
  return (
    <ButtonGroup width='full'>
      <WalletButton
        deviceBusy={deviceBusy}
        onConnect={handleConnect}
        walletInfo={walletInfo}
        isConnected={isConnected}
        isDemoWallet={isDemoWallet}
        isLoadingLocalWallet={state.isLoadingLocalWallet}
      />
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label='Open wallet dropdown menu'
          icon={<ChevronDownIcon />}
          data-test='navigation-wallet-dropdown-button'
        />
        <MenuList
          maxWidth={{ base: 'full', md: 'xs' }}
          minWidth={{ base: 0, md: 'xs' }}
          overflow='hidden'
          // Override zIndex to prevent InputLeftElement displaying over menu
          zIndex={2}
        >
          {hasWallet ? (
            <WalletConnected
              isConnected={isConnected || isDemoWallet}
              walletInfo={walletInfo}
              onDisconnect={disconnect}
              type={type}
            />
          ) : (
            <NoWallet onClick={handleConnect} />
          )}
        </MenuList>
      </Menu>
    </ButtonGroup>
  )
}
