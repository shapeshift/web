import { EditIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuItem } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

const editIcon = <EditIcon />

export const LedgerMenu = () => {
  const { dispatch } = useWallet()
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')

  const accountManagementPopover = useModal('manageAccounts')

  const handleChainsClick = useCallback(() => {
    const ledgerRoutes = SUPPORTED_WALLETS[KeyManager.Ledger].routes
    const path = ledgerRoutes.find(route => route.path === '/ledger/chains')?.path as string
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: path,
    })

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  const handleManageAccountsMenuItemClick = useCallback(
    () => accountManagementPopover.open({ title: translate('manageAccounts.modalTitle') }),
    [accountManagementPopover, translate],
  )

  return (
    <>
      <MenuDivider />
      {isAccountManagementEnabled && (
        <MenuItem icon={editIcon} onClick={handleManageAccountsMenuItemClick}>
          {translate('manageAccounts.menuTitle')}
        </MenuItem>
      )}
      {/* TODO: Remove the below menu item once the new flow is added, and before the feature flag is enabled */}
      <MenuItem justifyContent='space-between' onClick={handleChainsClick}>
        {translate('walletProvider.ledger.chains.header')}
      </MenuItem>
    </>
  )
}
