import { MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { TbPlugConnected } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

const reconnectIcon = <TbPlugConnected />

type LedgerMenuProps = {
  onClose?: () => void
}

export const LedgerMenu: React.FC<LedgerMenuProps> = ({ onClose }) => {
  const { dispatch, state } = useWallet()
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const isLedgerAccountManagementEnabled = useFeatureFlag('AccountManagementLedger')
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  const handleChainsClick = useCallback(() => {
    const ledgerRoutes = SUPPORTED_WALLETS[KeyManager.Ledger].routes
    const path = ledgerRoutes.find(route => route.path === '/ledger/chains')?.path as string
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: path,
    })

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  const handleReconnectWallet = useCallback(() => {
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: '/ledger/connect',
    })
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    onClose?.()
  }, [dispatch, onClose])

  const isConnected = state.isConnected

  return (
    <>
      <ManageAccountsMenuItem onClose={onClose} />
      {!isConnected && isLedgerReadOnlyEnabled && (
        <MenuItem icon={reconnectIcon} onClick={handleReconnectWallet} color='green.500'>
          {translate('connectWallet.menu.reconnectWallet')}
        </MenuItem>
      )}
      {/* TODO: Remove the below menu item once the new flow is added, and before the feature flag is enabled */}
      {(!isAccountManagementEnabled || !isLedgerAccountManagementEnabled) && (
        <MenuItem justifyContent='space-between' onClick={handleChainsClick}>
          {translate('walletProvider.ledger.chains.header')}
        </MenuItem>
      )}
    </>
  )
}
