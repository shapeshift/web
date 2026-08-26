import { ChevronDownIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Box, ButtonGroup, Menu, MenuGroup, MenuItem, MenuList } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { DrawerWalletMenu } from './DrawerWalletMenu'
import { WalletButton } from './WalletButton'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'
import { vibrate } from '@/lib/vibrate'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

const warningTwoIcon = <WarningTwoIcon />

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

// A local wallet resolves before its info does, so the menu has a wallet but nothing to name yet
const Connecting = () => {
  const translate = useTranslate()

  return (
    <MenuGroup title={translate('common.connectedWallet')} color='text.subtle'>
      <MenuItem icon={warningTwoIcon} isDisabled>
        {translate('connectWallet.menu.connecting')}
      </MenuItem>
    </MenuGroup>
  )
}

type WalletMenuProps = {
  onClick?: () => void
}

// The side nav is already a drawer, so the wallet menu renders inline rather than opening another
export const WalletMenu = memo(({ onClick }: WalletMenuProps) => {
  const {
    state: { isConnected, walletInfo, connectedType, isLocked, isLoadingLocalWallet },
    dispatch,
    disconnect,
  } = useWallet()

  const manageHiddenAssets = useModal('manageHiddenAssets')

  const maybeRdns = useAppSelector(selectWalletRdns)
  const activeSafeCard = useAppSelector(gridplusSlice.selectors.selectActiveSafeCard)
  const mipdProviders = useMipdProviders()
  const maybeMipdProvider = useMemo(
    () => mipdProviders.find(provider => provider.info.rdns === maybeRdns),
    [mipdProviders, maybeRdns],
  )

  const hasWallet = Boolean(walletInfo?.deviceId)

  const label = useMemo(() => {
    const baseName = maybeMipdProvider?.info?.name || walletInfo?.meta?.label || walletInfo?.name
    if (baseName === 'GridPlus' && activeSafeCard) return `GridPlus - ${activeSafeCard.name}`

    return baseName
  }, [walletInfo, maybeMipdProvider?.info?.name, activeSafeCard])

  const handleConnect = useCallback(() => {
    vibrate('heavy')
    onClick?.()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch, onClick])

  const handleDisconnect = useCallback(() => {
    disconnect()
    onClick?.()
  }, [disconnect, onClick])

  // The drawer routes to its own screen, but this menu renders under the app router
  const handleManageHiddenAssets = useCallback(() => {
    onClick?.()
    manageHiddenAssets.open({})
  }, [manageHiddenAssets, onClick])

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
            {hasWallet ? (
              <DrawerWalletMenu
                walletInfo={maybeMipdProvider?.info ?? walletInfo}
                connectedType={connectedType}
                label={label}
                isLocked={isLocked}
                onDisconnect={handleDisconnect}
                onSwitchProvider={handleConnect}
                onManageHiddenAssets={handleManageHiddenAssets}
                onClose={onClick}
              />
            ) : isLoadingLocalWallet ? (
              <Connecting />
            ) : (
              <NoWallet onClick={handleConnect} />
            )}
          </MenuList>
        </Menu>
      </Box>
    </ButtonGroup>
  )
})
