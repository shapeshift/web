import { ArrowBackIcon, ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/layout'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Button, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useLocation } from 'react-router-dom'
import { useMenuRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { WalletConnectedProps, WalletImage } from 'components/Layout/Header/NavBar/UserMenu'
import { RawText, Text } from 'components/Text'
import { KeyManager } from 'context/WalletProvider/config'

export const WalletConnectedMenuRoutes = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
  type
}: WalletConnectedProps) => {
  const { handleKeepKeyClick, handleBackClick } = useMenuRoutes()
  const location = useLocation()
  const translate = useTranslate()
  const isKeepKey = type === KeyManager.KeepKey

  const mainMenu = () => {
    return (
      <MenuGroup title={translate('common.connectedWallet')} ml={3} color='gray.500'>
        <MenuItem
          closeOnSelect={!isKeepKey}
          onClick={handleKeepKeyClick}
          icon={<WalletImage walletInfo={walletInfo} />}
        >
          <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
            <RawText>{walletInfo?.name}</RawText>
            {!isConnected && (
              <Text
                translation={'connectWallet.menu.disconnected'}
                fontSize='sm'
                color='yellow.500'
              />
            )}
            {isKeepKey && <ChevronRightIcon />}
          </Flex>
        </MenuItem>
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

  const keepKeyMenu = () => {
    return (
      <>
        <Flex mb={3} ml={3} flexDir='row' justifyContent='space-between' alignItems='center'>
          <Button onClick={handleBackClick} size='sm'>
            <ArrowBackIcon color='lightgrey' />
          </Button>
          <Center fontWeight='bold' color='white' fontSize='sm' flex={1}>
            {translate('common.connectedWalletSettings')}
          </Center>
        </Flex>
        <MenuGroup>
          <MenuItem
            closeOnSelect={!isKeepKey}
            onClick={handleKeepKeyClick}
            icon={<WalletImage walletInfo={walletInfo} />}
          >
            <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
              <RawText>{walletInfo?.name}</RawText>
              {!isConnected && (
                <Text
                  translation={'connectWallet.menu.disconnected'}
                  fontSize='sm'
                  color='yellow.500'
                />
              )}
            </Flex>
          </MenuItem>
          <MenuDivider />
          <MenuItem onClick={handleBackClick} command={'Up to date (v3.253)'}>
            Bootloader
          </MenuItem>
          <MenuItem onClick={handleBackClick} command={'Update available (v6.04)'}>
            Firmware
          </MenuItem>
          <MenuDivider />
          <MenuItem onClick={handleBackClick} command={walletInfo?.name}>
            Label
          </MenuItem>
          <MenuItem onClick={handleBackClick} command={'********'}>
            PIN
          </MenuItem>
          <MenuDivider />
        </MenuGroup>
        <MenuGroup title={'Advanced'} ml={3} color='gray.500'>
          <MenuItem onClick={handleBackClick} command={'10 Minutes'}>
            Device Timeout
          </MenuItem>
          <MenuItem onClick={handleBackClick} command={'Disabled'}>
            PIN Caching
          </MenuItem>
          <MenuItem onClick={handleBackClick} command={'Enabled'}>
            Passphrase
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={<CloseIcon />} onClick={handleBackClick}>
            Wipe Device
          </MenuItem>
        </MenuGroup>
      </>
    )
  }

  return (
    <Switch location={location} key={location.key}>
      <Route path='/main' component={mainMenu} />
      <Route path='/keepkey' component={keepKeyMenu} />
    </Switch>
  )
}
