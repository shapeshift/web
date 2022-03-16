import { ArrowBackIcon, ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/layout'
import { Menu, MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Button, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useLocation } from 'react-router-dom'
import { ExpandedMenuItem } from 'components/Layout/Header/NavBar/ExpandedMenuItem'
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
  const { handleKeepKeyClick, handleBackClick, handleMenuClose } = useMenuRoutes()
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
          <Center fontWeight='bold' color='white' fontSize='sm' flex={1} pr={7}>
            {translate('common.connectedWalletSettings')}
          </Center>
        </Flex>
        <MenuGroup>
          <Flex ml={3}>
            <WalletImage walletInfo={walletInfo} />
            <Flex flex={1} ml={3} justifyContent='space-between' alignItems='center'>
              <RawText>{walletInfo?.name}</RawText>
              {!isConnected && (
                <Text
                  mr={3}
                  translation={'connectWallet.menu.disconnected'}
                  fontSize='sm'
                  color='yellow.500'
                />
              )}
            </Flex>
          </Flex>
          <MenuDivider />
          <ExpandedMenuItem
            label='Bootloader'
            value='Up to date'
            badge='v3.253'
            badgeColor='green'
            hasSubmenu={true}
          />
          <ExpandedMenuItem
            label='Firmware'
            value='Update available'
            badge='v6.04'
            badgeColor='yellow'
            hasSubmenu={true}
            valueDisposition='info'
          />
          <MenuDivider />
          <ExpandedMenuItem label='Label' value={walletInfo?.name} hasSubmenu={true} />
          <ExpandedMenuItem label='PIN' value='********' hasSubmenu={true} />
          <MenuDivider />
        </MenuGroup>
        <MenuGroup title={'Advanced'} ml={3} color='gray.500'>
          <ExpandedMenuItem label='Device Timeout' value='10 Minutes' hasSubmenu={true} />
          <ExpandedMenuItem label='PIN Caching' value='Disabled' hasSubmenu={true} />
          <ExpandedMenuItem
            label='Passphrase'
            value='Enabled'
            hasSubmenu={true}
            valueDisposition='positive'
          />
          <MenuDivider />
          <MenuItem color='red.500' icon={<CloseIcon />}>
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
