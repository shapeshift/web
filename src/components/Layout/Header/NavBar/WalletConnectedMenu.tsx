import { ChevronRightIcon, CloseIcon, RepeatIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Flex, Icon, IconButton, MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { memo, useCallback, useMemo } from 'react'
import { TbEdit, TbTrash } from 'react-icons/tb'
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
import { WalletActions } from '@/context/WalletProvider/actions'
import type { WalletProviderRouteProps } from '@/context/WalletProvider/config'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'
import { useWallet } from '@/hooks/useWallet/useWallet'

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
    onClose,
  }: WalletConnectedProps & {
    connectedWalletMenuRoutes: boolean
  }) => {
    const { navigateToRoute } = useMenuRoutes()
    const translate = useTranslate()
    const { dispatch } = useWallet()
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

    const handleRenameClick = useCallback(() => {
      dispatch({
        type: WalletActions.SET_INITIAL_ROUTE,
        payload: NativeWalletRoutes.Rename,
      })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      onClose && onClose()
    }, [dispatch, onClose])

    const handleDeleteClick = useCallback(() => {
      dispatch({
        type: WalletActions.SET_INITIAL_ROUTE,
        payload: NativeWalletRoutes.Delete,
      })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      onClose && onClose()
    }, [dispatch, onClose])

    const menuItemIcon = useMemo(() => <WalletImage walletInfo={walletInfo} />, [walletInfo])
    const isNativeWallet = connectedType === KeyManager.Native

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
              <Flex flexDir='row' justifyContent='space-between' alignItems='center' width='full'>
                <RawText>{walletInfo?.name}</RawText>
                <Flex alignItems='center' gap={2}>
                  {!isConnected && (
                    <Text
                      translation={'connectWallet.menu.disconnected'}
                      fontSize='sm'
                      color='yellow.500'
                    />
                  )}
                  {isNativeWallet && (
                    <>
                      <Box
                        w={6}
                        h={6}
                        borderRadius='full'
                        bg='whiteAlpha.200'
                        color='whiteAlpha.700'
                        cursor='pointer'
                        zIndex={9999}
                        position='relative'
                        pointerEvents='all'
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        _hover={{ bg: 'whiteAlpha.300', color: 'white' }}
                        onMouseDown={e => {
                          e.stopPropagation()
                          e.preventDefault()
                          handleRenameClick()
                        }}
                      >
                        <Icon as={TbEdit} boxSize={3} pointerEvents='none' />
                      </Box>
                      <Box
                        w={6}
                        h={6}
                        borderRadius='full'
                        bg='red.500'
                        color='white'
                        cursor='pointer'
                        zIndex={9999}
                        position='relative'
                        pointerEvents='all'
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        _hover={{ bg: 'red.400' }}
                        onMouseDown={e => {
                          e.stopPropagation()
                          e.preventDefault()
                          handleDeleteClick()
                        }}
                      >
                        <Icon as={TbTrash} boxSize={3} pointerEvents='none' />
                      </Box>
                    </>
                  )}
                  {connectedWalletMenuRoutes && <ChevronRightIcon />}
                </Flex>
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
          <MenuItem icon={repeatIcon} onClick={onSwitchProvider}>
            {translate('connectWallet.menu.switchWallet')}
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
