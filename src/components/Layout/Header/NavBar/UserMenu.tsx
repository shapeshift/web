import { ChevronRightIcon, CloseIcon, HamburgerIcon, MoonIcon, RepeatIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuDivider, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import {
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Switch,
  useColorMode,
  useColorModeValue,
  useMediaQuery
} from '@chakra-ui/react'
import { FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { InitialState, useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { breakpoints } from 'theme/theme'

import { WalletImage } from './WalletButton'

const NoWallet = ({ onClick }: { onClick: () => void }) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.noWallet')} ml={3} color='gray.500'>
      <MenuItem onClick={onClick} alignItems='center' justifyContent='space-between'>
        {translate('common.connectWallet')}
        <ChevronRightIcon />
      </MenuItem>
    </MenuGroup>
  )
}

type WalletConnectedProps = {
  onDisconnect: () => void
  onSwitchProvider: () => void
} & Pick<InitialState, 'walletInfo'>

const WalletConnected = ({ walletInfo, onDisconnect, onSwitchProvider }: WalletConnectedProps) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.connectedWallet')} ml={3} color='gray.500'>
      <MenuItem icon={<WalletImage walletInfo={walletInfo} />}>{walletInfo?.name}</MenuItem>
      <MenuDivider ml={3} />
      <MenuItem icon={<RepeatIcon />} onClick={onSwitchProvider}>
        {translate('connectWallet.menu.switchWallet')}
      </MenuItem>
      <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={onDisconnect} color='red.500'>
        {translate('connectWallet.menu.disconnect')}
      </MenuItem>
    </MenuGroup>
  )
}

type WalletButtonProps = {
  isConnected: boolean
  onConnect: () => void
} & Pick<InitialState, 'walletInfo'>

const WalletButton = ({ isConnected, walletInfo, onConnect }: WalletButtonProps) => {
  return isConnected ? (
    <Button onClick={onConnect} leftIcon={<WalletImage walletInfo={walletInfo} />}>
      {walletInfo?.name}
    </Button>
  ) : (
    <Button onClick={onConnect} leftIcon={<FaWallet />}>
      <Text translation='common.connectWallet' />
    </Button>
  )
}

export const UserMenu = () => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const { toggleColorMode } = useColorMode()
  const isActive = useColorModeValue(false, true)
  const { state, dispatch, disconnect } = useWallet()
  const { isConnected, walletInfo } = state

  const handleConnect = () => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }

  return (
    <ButtonGroup isAttached colorScheme='blue' variant='ghost-filled'>
      {isLargerThanMd && (
        <WalletButton onConnect={handleConnect} walletInfo={walletInfo} isConnected={isConnected} />
      )}
      <Menu>
        <MenuButton as={IconButton} isRound={!isLargerThanMd}>
          <HamburgerIcon />
        </MenuButton>
        <MenuList width={{ base: '100vw', md: '300px' }} maxWidth='100%' minWidth={0}>
          {isConnected ? (
            <WalletConnected
              walletInfo={walletInfo}
              onDisconnect={disconnect}
              onSwitchProvider={handleConnect}
            />
          ) : (
            <NoWallet onClick={handleConnect} />
          )}
          <MenuDivider />
          <MenuItem
            icon={<MoonIcon />}
            closeOnSelect={false}
            justifyContent='space-between'
            onClick={toggleColorMode}
          >
            <Flex justifyContent='space-between' alignItems='center'>
              <Text translation='common.darkMode' />
              <Switch isChecked={isActive} />
            </Flex>
          </MenuItem>
        </MenuList>
      </Menu>
    </ButtonGroup>
  )
}
