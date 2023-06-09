import { ChevronRightIcon, CloseIcon, RepeatIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Flex, MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useLocation } from 'react-router-dom'
import {
  useMenuRoutes,
  WalletConnectedRoutes,
} from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubMenuContainer } from 'components/Layout/Header/NavBar/SubMenuContainer'
import type { WalletConnectedProps } from 'components/Layout/Header/NavBar/UserMenu'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { RawText, Text } from 'components/Text'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'

export const WalletConnectedMenu = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
  type,
}: WalletConnectedProps) => {
  const { navigateToRoute } = useMenuRoutes()
  const location = useLocation()
  const translate = useTranslate()
  const connectedWalletMenuRoutes = useMemo(
    () => type && SUPPORTED_WALLETS[type].connectedWalletMenuRoutes,
    [type],
  )
  const ConnectMenuComponent = useMemo(
    () => type && SUPPORTED_WALLETS[type].connectedMenuComponent,
    [type],
  )

  const ConnectedMenu = () => {
    return (
      <MenuGroup title={translate('common.connectedWallet')} color='gray.500'>
        {walletInfo ? (
          <MenuItem
            closeOnSelect={!connectedWalletMenuRoutes}
            isDisabled={!connectedWalletMenuRoutes}
            onClick={
              connectedWalletMenuRoutes
                ? () =>
                    navigateToRoute(
                      (type && SUPPORTED_WALLETS[type])?.connectedWalletMenuInitialPath ??
                        WalletConnectedRoutes.Connected,
                    )
                : undefined
            }
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
              {connectedWalletMenuRoutes && <ChevronRightIcon />}
            </Flex>
          </MenuItem>
        ) : (
          <MenuItem icon={<WarningTwoIcon />} onClick={onSwitchProvider} isDisabled={true}>
            {translate('connectWallet.menu.connecting')}
          </MenuItem>
        )}
        {ConnectMenuComponent && <ConnectMenuComponent />}
        <MenuDivider />
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
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path={WalletConnectedRoutes.Connected}>
          <SubMenuContainer>
            <ConnectedMenu />
          </SubMenuContainer>
        </Route>
        {connectedWalletMenuRoutes?.map(route => {
          const Component = route.component
          return !Component ? null : (
            <Route
              key='walletConnectedMenuRoute'
              exact
              path={route.path}
              render={routeProps => <Component {...routeProps} />}
            />
          )
        })}
      </Switch>
    </AnimatePresence>
  )
}
