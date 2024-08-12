import { MenuDivider, MenuItem } from '@chakra-ui/react'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { ManageAccountsMenuItem } from 'components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { WalletActions } from 'context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

type LedgerMenuProps = {
  onClose?: () => void
}

export const LedgerMenu: React.FC<LedgerMenuProps> = ({ onClose }) => {
  const { dispatch, state } = useWallet()
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const isLedgerAccountManagementEnabled = useFeatureFlag('AccountManagementLedger')
  const accountManagementPopover = useModal('manageAccounts')

  const [hasCompletedChainInit, setHasCompletedChainInit] = useState(false)

  // We want this to run just once, upon Ledger connection, to show the user their connected chains and accounts
  useEffect(() => {
    if (
      state.modalType === KeyManager.Ledger &&
      !hasCompletedChainInit &&
      isAccountManagementEnabled &&
      isLedgerAccountManagementEnabled
    ) {
      accountManagementPopover.open({})
      setHasCompletedChainInit(true)
    }
  }, [
    accountManagementPopover,
    hasCompletedChainInit,
    isAccountManagementEnabled,
    isLedgerAccountManagementEnabled,
    state.modalType,
  ])

  const handleChainsClick = useCallback(() => {
    const ledgerRoutes = SUPPORTED_WALLETS[KeyManager.Ledger].routes
    const path = ledgerRoutes.find(route => route.path === '/ledger/chains')?.path as string
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: path,
    })

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  return (
    <>
      <MenuDivider />
      <ManageAccountsMenuItem onClose={onClose} />
      {/* TODO: Remove the below menu item once the new flow is added, and before the feature flag is enabled */}
      {(!isAccountManagementEnabled || !isLedgerAccountManagementEnabled) && (
        <MenuItem justifyContent='space-between' onClick={handleChainsClick}>
          {translate('walletProvider.ledger.chains.header')}
        </MenuItem>
      )}
    </>
  )
}
