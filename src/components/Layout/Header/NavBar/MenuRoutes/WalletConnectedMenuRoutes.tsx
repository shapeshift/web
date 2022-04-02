import { ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useLocation } from 'react-router-dom'
import {
  useMenuRoutes,
  WalletConnectedRoutes
} from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { KeepKeyMenuRoutes } from 'components/Layout/Header/NavBar/MenuRoutes/KeepKeyMenuRoutes'
import { WalletConnectedProps } from 'components/Layout/Header/NavBar/UserMenu'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { RawText, Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export const WalletConnectedMenuRoutes = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
  type
}: WalletConnectedProps) => {
  const { navigateToRoute } = useMenuRoutes()
  const location = useLocation()
  const translate = useTranslate()
  const { keepKeyWallet } = useKeepKey()

  const connectedMenu = () => {
    return (
      <MenuGroup title={translate('common.connectedWallet')} ml={3} color='gray.500'>
        <MenuItem
          closeOnSelect={!keepKeyWallet}
          onClick={keepKeyWallet ? () => navigateToRoute(WalletConnectedRoutes.KeepKey) : undefined}
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
            {keepKeyWallet && <ChevronRightIcon />}
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

  return (
    <Switch location={location} key={location.key}>
      <Route exact path={WalletConnectedRoutes.Connected} component={connectedMenu} />
      <KeepKeyMenuRoutes />
    </Switch>
  )
}
