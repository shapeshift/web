import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { Box, ButtonGroup, Menu, MenuGroup, MenuItem, MenuList } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter } from 'react-router-dom'

import { WalletButton } from './WalletButton'

import { WalletConnectedRoutes } from '@/components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { WalletConnectedMenu } from '@/components/Layout/Header/NavBar/WalletConnectedMenu'
import { WalletActions } from '@/context/WalletProvider/actions'
import type { InitialState } from '@/context/WalletProvider/WalletProvider'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'
import { vibrate } from '@/lib/vibrate'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

export const entries = [WalletConnectedRoutes.Connected]

const maxWidthProp = { base: 'full', md: 'xs' }
const minWidthProp = { base: 0, md: 'xs' }

const NoWallet = ({ onClick }: { onClick: () => void }) => {
  const translate = useTranslate()
  return (
    <MenuGroup title={translate('common.noWallet')} ml={3} color='text.subtle'>
      <MenuItem onClick={onClick} alignItems='center' justifyContent='space-between'>
        {translate('common.connectWallet')}
        <ChevronDownIcon />
      </MenuItem>
    </MenuGroup>
  )
}

export type WalletConnectedProps = {
  onDisconnect: () => void
  onSwitchProvider: () => void
  onClose?: () => void
  walletInfo: {
    icon: ComponentWithAs<'svg', IconProps> | string
    name: string
  } | null
} & Pick<InitialState, 'isConnected' | 'connectedType'>

export const WalletConnected = (props: WalletConnectedProps) => {
  return (
    <MemoryRouter initialEntries={entries}>
      <WalletConnectedMenu
        isConnected={props.isConnected}
        walletInfo={props.walletInfo}
        onDisconnect={props.onDisconnect}
        onSwitchProvider={props.onSwitchProvider}
        connectedType={props.connectedType}
        onClose={props.onClose}
      />
    </MemoryRouter>
  )
}

export const UserMenu: React.FC<{ onClick?: () => void }> = memo(({ onClick }) => {
  const { state, dispatch, disconnect } = useWallet()
  const { isConnected, walletInfo, connectedType, isLocked, isLoadingLocalWallet } = state

  const maybeRdns = useAppSelector(selectWalletRdns)

  const mipdProviders = useMipdProviders()
  const maybeMipdProvider = mipdProviders.find(provider => provider.info.rdns === maybeRdns)

  const hasWallet = Boolean(walletInfo?.deviceId)
  const handleConnect = useCallback(() => {
    vibrate('heavy')
    onClick && onClick()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch, onClick])

  const handleDisconnect = useCallback(() => {
    disconnect()
    onClick && onClick()
  }, [disconnect, onClick])
  return (
    <ButtonGroup width='full'>
      <Box>
        <Menu autoSelect={false}>
          <WalletButton
            isMenuContext
            onConnect={handleConnect}
            walletInfo={walletInfo}
            isConnected={isConnected && !isLocked}
            isLoadingLocalWallet={isLoadingLocalWallet}
            data-test='navigation-wallet-dropdown-button'
          />
          <MenuList
            maxWidth={maxWidthProp}
            minWidth={minWidthProp}
            overflow='hidden'
            // Override zIndex to prevent InputLeftElement displaying over menu
            zIndex={2}
          >
            {hasWallet || isLoadingLocalWallet ? (
              <WalletConnected
                isConnected={isConnected}
                walletInfo={maybeMipdProvider?.info || walletInfo}
                onDisconnect={handleDisconnect}
                onSwitchProvider={handleConnect}
                connectedType={connectedType}
                onClose={onClick}
              />
            ) : (
              <NoWallet onClick={handleConnect} />
            )}
          </MenuList>
        </Menu>
      </Box>
    </ButtonGroup>
  )
})
