import {
  ChevronRightIcon,
  CloseIcon,
  RepeatIcon,
  SettingsIcon,
  ViewIcon,
  WarningTwoIcon,
} from '@chakra-ui/icons'
import { Flex, MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import {
  useMenuRoutes,
  WalletConnectedRoutes,
} from '@/components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubMenuContainer } from '@/components/Layout/Header/NavBar/SubMenuContainer'
import type { WalletConnectedProps } from '@/components/Layout/Header/NavBar/UserMenu'
import { WalletImage } from '@/components/Layout/Header/NavBar/WalletImage'
import { RawText, Text } from '@/components/Text'
import type { WalletProviderRouteProps } from '@/context/WalletProvider/config'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

const warningTwoIcon = <WarningTwoIcon />
const closeIcon = <CloseIcon />
const repeatIcon = <RepeatIcon />
const settingsIcon = <SettingsIcon />
const viewIcon = <ViewIcon />

const ConnectedMenu = memo(
  ({
    connectedWalletMenuRoutes,
    isConnected,
    connectedType,
    walletInfo,
    onDisconnect,
    onSwitchProvider,
    onClose,
  }: WalletConnectedProps & {
    connectedWalletMenuRoutes: boolean
  }) => {
    const { navigateToRoute } = useMenuRoutes()
    const translate = useTranslate()
    const settings = useModal('settings')
    const manageHiddenAssets = useModal('manageHiddenAssets')
    const walletType = useAppSelector(selectWalletType)
    const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
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

    const handleSettingsClick = useCallback(() => {
      onClose && onClose()
      settings.open({})
    }, [onClose, settings])

    const handleManageHiddenAssetsClick = useCallback(() => {
      onClose && onClose()
      manageHiddenAssets.open({})
    }, [onClose, manageHiddenAssets])

    const menuItemIcon = useMemo(() => <WalletImage walletInfo={walletInfo} />, [walletInfo])
    const isLedger = walletType === KeyManager.Ledger
    const showLedgerDisconnectedState = !isConnected && isLedger && isLedgerReadOnlyEnabled

    return (
      <>
        <MenuGroup title={translate('common.connectedWallet')} color='text.subtle'>
          {walletInfo ? (
            <MenuItem
              closeOnSelect={!connectedWalletMenuRoutes}
              isDisabled={!connectedWalletMenuRoutes}
              onClick={handleClick}
              icon={menuItemIcon}
            >
              <Flex
                flexDir='column'
                justifyContent='flex-start'
                alignItems='flex-start'
                width='100%'
              >
                <Flex flexDir='row' justifyContent='space-between' alignItems='center' width='100%'>
                  <RawText>{walletInfo?.name}</RawText>
                  {connectedWalletMenuRoutes && <ChevronRightIcon />}
                </Flex>
                {showLedgerDisconnectedState && (
                  <Text
                    translation={'connectWallet.menu.walletNotConnected'}
                    fontSize='xs'
                    color='yellow.500'
                    mt={1}
                  />
                )}
                {!isConnected && !isLedger && (
                  <Text
                    translation={'connectWallet.menu.disconnected'}
                    fontSize='sm'
                    color='yellow.500'
                  />
                )}
              </Flex>
            </MenuItem>
          ) : (
            <MenuItem icon={warningTwoIcon} onClick={onSwitchProvider} isDisabled={true}>
              {translate('connectWallet.menu.connecting')}
            </MenuItem>
          )}
        </MenuGroup>
        <MenuDivider />
        <MenuGroup title={translate('common.walletActions')} color='text.subtle'>
          {ConnectMenuComponent && <ConnectMenuComponent onClose={onClose} />}
          <MenuDivider />
          <MenuItem icon={viewIcon} onClick={handleManageHiddenAssetsClick}>
            {translate('manageHiddenAssets.title')}
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={repeatIcon} onClick={onSwitchProvider}>
            {translate('connectWallet.menu.switchWallet')}
          </MenuItem>
          <MenuItem icon={settingsIcon} onClick={handleSettingsClick}>
            {translate('common.settings')}
          </MenuItem>
          <MenuItem fontWeight='medium' icon={closeIcon} onClick={onDisconnect} color='red.500'>
            {translate('connectWallet.menu.disconnect')}
          </MenuItem>
        </MenuGroup>
      </>
    )
  },
)

export const WalletConnectedMenu = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
  connectedType,
  onClose,
}: WalletConnectedProps) => {
  const connectedWalletMenuRoutes = useMemo(
    () => connectedType && SUPPORTED_WALLETS[connectedType].connectedWalletMenuRoutes,
    [connectedType],
  )

  const location = useLocation()

  const renderRoute = useCallback((route: WalletProviderRouteProps, i: number) => {
    const Component = route.component
    return (
      <Route key={`walletConnectedMenuRoute_${i}`} path={route.path || ''}>
        <Component />
      </Route>
    )
  }, [])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location.pathname}>
        <Route path={WalletConnectedRoutes.Connected}>
          <SubMenuContainer>
            <ConnectedMenu
              connectedWalletMenuRoutes={!!connectedWalletMenuRoutes}
              isConnected={isConnected}
              connectedType={connectedType}
              walletInfo={walletInfo}
              onDisconnect={onDisconnect}
              onSwitchProvider={onSwitchProvider}
              onClose={onClose}
            />
          </SubMenuContainer>
        </Route>
        {connectedWalletMenuRoutes?.map((route, index) => renderRoute(route, index))}
      </Switch>
    </AnimatePresence>
  )
}
