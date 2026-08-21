import { ChevronDownIcon } from '@chakra-ui/icons'
import { Box, ButtonGroup, Menu, MenuGroup, MenuItem, MenuList } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { DrawerWalletMenu } from './DrawerWalletMenu'
import { WalletButton } from './WalletButton'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'
import { vibrate } from '@/lib/vibrate'
import { gridplusSlice } from '@/state/slices/gridplusSlice/gridplusSlice'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

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

type WalletMenuProps = {
  onClick?: () => void
}

// The side nav is already a drawer, so the wallet menu renders inline rather than opening another
export const WalletMenu = memo(({ onClick }: WalletMenuProps) => {
  const navigate = useNavigate()
  const {
    state: { isConnected, walletInfo, connectedType, isLocked, isLoadingLocalWallet },
    dispatch,
    disconnect,
  } = useWallet()

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

  const handleManageHiddenAssets = useCallback(() => {
    onClick?.()
    navigate('/manage-hidden-assets')
  }, [navigate, onClick])

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
              <DrawerWalletMenu
                walletInfo={maybeMipdProvider?.info ?? walletInfo}
                connectedType={connectedType}
                label={label}
                isLocked={isLocked}
                onDisconnect={handleDisconnect}
                onSwitchProvider={handleConnect}
                onManageHiddenAssets={handleManageHiddenAssets}
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
