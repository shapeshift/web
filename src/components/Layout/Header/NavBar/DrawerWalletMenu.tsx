import { ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { Flex, Icon, MenuDivider, MenuGroup, MenuItem, Text } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import type { ComponentProps } from 'react'
import { useCallback, useMemo } from 'react'
import { TbEyeOff, TbPlugConnected } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { useMenuRoutes, WalletConnectedRoutes } from './hooks/useMenuRoutes'
import { SubMenuContainer } from './SubMenuContainer'
import { WalletImage } from './WalletImage'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SuspenseErrorBoundary } from '@/components/ErrorBoundary'
import { WalletActions } from '@/context/WalletProvider/actions'
import type { WalletProviderRouteProps } from '@/context/WalletProvider/config'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'
import { RDNS_TO_FIRST_CLASS_KEYMANAGER } from '@/context/WalletProvider/WalletViews/constants'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

const entries = [WalletConnectedRoutes.Connected]

// The default loading fallback is full height, which blows the menu open while a chunk loads
const suspenseFallback = (
  <Flex justifyContent='center' alignItems='center' height='120px'>
    <CircularProgress />
  </Flex>
)

const eyeOffIcon = <Icon as={TbEyeOff} />
const reconnectIcon = <Icon as={TbPlugConnected} />
const repeatIcon = <RepeatIcon />
const closeIcon = <CloseIcon />

export type DrawerWalletMenuProps = {
  walletInfo: ComponentProps<typeof WalletImage>['walletInfo']
  connectedType: InitialState['connectedType']
  label: string | undefined
  isLocked: boolean
  onDisconnect: () => void
  onSwitchProvider: () => void
  onManageHiddenAssets: () => void
  onClose?: () => void
}

const useConnectedWalletMenuRoutes = (connectedType: InitialState['connectedType']) =>
  useMemo(
    () => connectedType && SUPPORTED_WALLETS[connectedType]?.connectedWalletMenuRoutes,
    [connectedType],
  )

// connect() resolves the connect route itself, but the modal routes MIPD wallets on connector
// type rather than path, so reconnect has to hand it the same arguments wallet selection does
const useReconnectTarget = (connectedType: InitialState['connectedType']) => {
  const maybeRdns = useAppSelector(selectWalletRdns)

  return useMemo(() => {
    if (maybeRdns && !(maybeRdns in RDNS_TO_FIRST_CLASS_KEYMANAGER))
      return { type: maybeRdns, isMipdProvider: true }
    // Trezor is the one wallet without a connect route to reopen
    if (!connectedType) return
    if (
      !SUPPORTED_WALLETS[connectedType].routes.some(route => String(route.path).endsWith('connect'))
    )
      return

    return { type: connectedType, isMipdProvider: false }
  }, [connectedType, maybeRdns])
}

const DrawerWalletMenuRoot = ({
  walletInfo,
  connectedType,
  label,
  isLocked,
  onDisconnect,
  onSwitchProvider,
  onManageHiddenAssets,
  onClose,
}: DrawerWalletMenuProps) => {
  const translate = useTranslate()
  const { navigateToRoute } = useMenuRoutes()
  const {
    state: { isConnected },
    dispatch,
    connect,
  } = useWallet()
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  const connectedWalletMenuRoutes = useConnectedWalletMenuRoutes(connectedType)
  const reconnectTarget = useReconnectTarget(connectedType)

  const status = useMemo(() => {
    if (isLocked) return { translation: 'connectWallet.menu.locked', fontSize: 'sm' }
    if (isConnected) return
    // A read-only Ledger is meant to sit disconnected until something needs the device
    if (isLedgerReadOnlyEnabled && connectedType === KeyManager.Ledger)
      return { translation: 'connectWallet.menu.walletNotConnected', fontSize: 'xs' }
    return { translation: 'connectWallet.menu.disconnected', fontSize: 'sm' }
  }, [connectedType, isConnected, isLedgerReadOnlyEnabled, isLocked])

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

  const handleReconnect = useCallback(() => {
    if (!reconnectTarget) return

    onClose?.()
    connect(reconnectTarget.type, reconnectTarget.isMipdProvider)
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [connect, dispatch, onClose, reconnectTarget])

  return (
    <>
      <MenuGroup title={translate('common.connectedWallet')} color='text.subtle'>
        <MenuItem
          icon={walletImageIcon}
          isDisabled={!connectedWalletMenuRoutes || isLocked}
          closeOnSelect={false}
          onClick={handleWalletClick}
        >
          <Flex flexDir='column' alignItems='flex-start' width='100%'>
            <Flex flexDir='row' justifyContent='space-between' alignItems='center' width='100%'>
              <Text>{label}</Text>
              {connectedWalletMenuRoutes && !isLocked && <ChevronRightIcon />}
            </Flex>
            {status && (
              <Text fontSize={status.fontSize} color='yellow.500' whiteSpace='normal'>
                {translate(status.translation)}
              </Text>
            )}
          </Flex>
        </MenuItem>
      </MenuGroup>
      <MenuDivider />
      <MenuGroup title={translate('common.walletActions')} color='text.subtle'>
        {/* GridPlus supplies a lazy component, and the menu remounts on every open */}
        {ConnectMenuComponent && (
          <SuspenseErrorBoundary loadingFallback={suspenseFallback}>
            <ConnectMenuComponent onClose={onClose} />
          </SuspenseErrorBoundary>
        )}
        {status && reconnectTarget && (
          <MenuItem icon={reconnectIcon} onClick={handleReconnect} color='green.500'>
            {translate('connectWallet.menu.reconnectWallet')}
          </MenuItem>
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
