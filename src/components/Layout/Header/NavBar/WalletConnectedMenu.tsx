import { ChevronRightIcon, CloseIcon, RepeatIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Flex, MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteProps } from 'react-router-dom'
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

const warningTwoIcon = <WarningTwoIcon />
const closeIcon = <CloseIcon />
const repeatIcon = <RepeatIcon />

const ConnectedMenu = memo(
  ({
    connectedWalletMenuRoutes,
    isConnected,
    connectedType,
    walletInfo,
    onDisconnect,
    onSwitchProvider,
  }: WalletConnectedProps & {
    connectedWalletMenuRoutes: boolean
  }) => {
    const { navigateToRoute } = useMenuRoutes()
    const translate = useTranslate()
    const ConnectMenuComponent = useMemo(
      () => connectedType && SUPPORTED_WALLETS[connectedType].connectedMenuComponent,
      [connectedType],
    )

    const handleClick = useCallback(() => {
      if (!connectedWalletMenuRoutes) return
      navigateToRoute(
        (connectedType && SUPPORTED_WALLETS[connectedType])?.connectedWalletMenuInitialPath ??
          WalletConnectedRoutes.Connected,
      )
    }, [connectedWalletMenuRoutes, navigateToRoute, connectedType])

    const menuItemIcon = useMemo(() => <WalletImage walletInfo={walletInfo} />, [walletInfo])

    return (
      <MenuGroup title={translate('common.connectedWallet')} color='text.subtle'>
        {walletInfo ? (
          <MenuItem
            closeOnSelect={!connectedWalletMenuRoutes}
            isDisabled={!connectedWalletMenuRoutes}
            onClick={handleClick}
            icon={menuItemIcon}
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
          <MenuItem icon={warningTwoIcon} onClick={onSwitchProvider} isDisabled={true}>
            {translate('connectWallet.menu.connecting')}
          </MenuItem>
        )}
        {ConnectMenuComponent && <ConnectMenuComponent />}
        <MenuDivider />
        <MenuItem icon={repeatIcon} onClick={onSwitchProvider}>
          {translate('connectWallet.menu.switchWallet')}
        </MenuItem>
        <MenuItem fontWeight='medium' icon={closeIcon} onClick={onDisconnect} color='red.500'>
          {translate('connectWallet.menu.disconnect')}
        </MenuItem>
      </MenuGroup>
    )
  },
)

export const WalletConnectedMenu = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
  connectedType,
}: WalletConnectedProps) => {
  const location = useLocation()

  const connectedWalletMenuRoutes = useMemo(
    () => connectedType && SUPPORTED_WALLETS[connectedType].connectedWalletMenuRoutes,
    [connectedType],
  )

  const renderRoute = useCallback((route: RouteProps, i: number) => {
    const Component = route.component
    return !Component ? null : (
      <Route
        key={`walletConnectedMenuRoute_${i}`}
        exact
        path={route.path}
        render={routeProps => <Component {...routeProps} />}
      />
    )
  }, [])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path={WalletConnectedRoutes.Connected}>
          <SubMenuContainer>
            <ConnectedMenu
              connectedWalletMenuRoutes={!!connectedWalletMenuRoutes}
              isConnected={isConnected}
              connectedType={connectedType}
              walletInfo={walletInfo}
              onDisconnect={onDisconnect}
              onSwitchProvider={onSwitchProvider}
            />
          </SubMenuContainer>
        </Route>
        {connectedWalletMenuRoutes?.map(renderRoute)}
      </Switch>
    </AnimatePresence>
  )
}
