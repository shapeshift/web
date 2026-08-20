import { ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { Flex, Icon, MenuDivider, MenuGroup, MenuItem, Text } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import type { ComponentProps } from 'react'
import { useCallback, useMemo } from 'react'
import { TbEyeOff } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { useMenuRoutes, WalletConnectedRoutes } from './hooks/useMenuRoutes'
import { SubMenuContainer } from './SubMenuContainer'
import { WalletImage } from './WalletImage'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SuspenseErrorBoundary } from '@/components/ErrorBoundary'
import type { WalletProviderRouteProps } from '@/context/WalletProvider/config'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'

const entries = [WalletConnectedRoutes.Connected]

// The default loading fallback is full height, which blows the menu open while a chunk loads
const suspenseFallback = (
  <Flex justifyContent='center' alignItems='center' height='120px'>
    <CircularProgress />
  </Flex>
)

const eyeOffIcon = <Icon as={TbEyeOff} />
const repeatIcon = <RepeatIcon />
const closeIcon = <CloseIcon />

export type DrawerWalletMenuProps = {
  walletInfo: ComponentProps<typeof WalletImage>['walletInfo']
  connectedType: InitialState['connectedType']
  label: string | undefined
  onDisconnect: () => void
  onSwitchProvider: () => void
  onManageHiddenAssets: () => void
}

const useConnectedWalletMenuRoutes = (connectedType: InitialState['connectedType']) =>
  useMemo(
    () => connectedType && SUPPORTED_WALLETS[connectedType]?.connectedWalletMenuRoutes,
    [connectedType],
  )

const DrawerWalletMenuRoot = ({
  walletInfo,
  connectedType,
  label,
  onDisconnect,
  onSwitchProvider,
  onManageHiddenAssets,
}: DrawerWalletMenuProps) => {
  const translate = useTranslate()
  const { navigateToRoute } = useMenuRoutes()

  const connectedWalletMenuRoutes = useConnectedWalletMenuRoutes(connectedType)

  const ConnectMenuComponent = useMemo(
    () => connectedType && SUPPORTED_WALLETS[connectedType]?.connectedMenuComponent,
    [connectedType],
  )

  const walletImageIcon = useMemo(() => <WalletImage walletInfo={walletInfo} />, [walletInfo])

  const handleWalletClick = useCallback(() => {
    if (!connectedWalletMenuRoutes) return

    navigateToRoute(
      (connectedType && SUPPORTED_WALLETS[connectedType]?.connectedWalletMenuInitialPath) ??
        WalletConnectedRoutes.Connected,
    )
  }, [connectedType, connectedWalletMenuRoutes, navigateToRoute])

  return (
    <>
      <MenuGroup title={translate('common.connectedWallet')} color='text.subtle'>
        <MenuItem
          icon={walletImageIcon}
          isDisabled={!connectedWalletMenuRoutes}
          closeOnSelect={false}
          onClick={handleWalletClick}
        >
          <Flex flexDir='row' justifyContent='space-between' alignItems='center' width='100%'>
            <Text>{label}</Text>
            {connectedWalletMenuRoutes && <ChevronRightIcon />}
          </Flex>
        </MenuItem>
      </MenuGroup>
      <MenuDivider />
      <MenuGroup title={translate('common.walletActions')} color='text.subtle'>
        {/* GridPlus supplies a lazy component, and the menu remounts on every open */}
        {ConnectMenuComponent && (
          <SuspenseErrorBoundary loadingFallback={suspenseFallback}>
            <ConnectMenuComponent />
          </SuspenseErrorBoundary>
        )}
        <MenuDivider />
        <MenuItem icon={eyeOffIcon} onClick={onManageHiddenAssets}>
          {translate('manageHiddenAssets.title')}
        </MenuItem>
        <MenuDivider />
        <MenuItem icon={repeatIcon} onClick={onSwitchProvider}>
          {translate('connectWallet.menu.switchWallet')}
        </MenuItem>
        <MenuItem fontWeight='medium' icon={closeIcon} onClick={onDisconnect} color='red.500'>
          {translate('connectWallet.menu.disconnect')}
        </MenuItem>
      </MenuGroup>
    </>
  )
}

const DrawerWalletMenuRoutes = (props: DrawerWalletMenuProps) => {
  const location = useLocation()
  const connectedWalletMenuRoutes = useConnectedWalletMenuRoutes(props.connectedType)

  const renderRoute = useCallback((route: WalletProviderRouteProps, i: number) => {
    const Component = route.component

    return (
      <Route key={`drawerWalletMenuRoute_${i}`} path={route.path || ''}>
        <SuspenseErrorBoundary loadingFallback={suspenseFallback}>
          <Component />
        </SuspenseErrorBoundary>
      </Route>
    )
  }, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location.pathname}>
        <Route path={WalletConnectedRoutes.Connected}>
          <SubMenuContainer>
            <DrawerWalletMenuRoot {...props} />
          </SubMenuContainer>
        </Route>
        {connectedWalletMenuRoutes?.map((route, index) => renderRoute(route, index))}
      </Switch>
    </AnimatePresence>
  )
}

export const DrawerWalletMenu = (props: DrawerWalletMenuProps) => {
  return (
    <MemoryRouter initialEntries={entries}>
      <DrawerWalletMenuRoutes {...props} />
    </MemoryRouter>
  )
}
