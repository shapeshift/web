import { EditIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

const editIcon = <EditIcon />
type ManageAccountsMenuItemProps = {
  onClose?: () => void
  displayDivider?: boolean
  onClick?: () => void
}

export const ManageAccountsMenuItem: React.FC<ManageAccountsMenuItemProps> = ({
  onClose,
  displayDivider,
  onClick,
}) => {
  const translate = useTranslate()
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const { state } = useWallet()
  const { wallet, connectedType } = state
  const accountManagementPopover = useModal('manageAccounts')

  const handleManageAccountsMenuItemClick = useCallback(() => {
    onClose && onClose()
    accountManagementPopover.open({})
  }, [accountManagementPopover, onClose])

  const shouldHideAccountManagement =
    isLedgerReadOnlyEnabled && connectedType === KeyManager.Ledger && !wallet

  return (
    <>
      {displayDivider && <MenuDivider />}
      {!shouldHideAccountManagement && (
        <MenuItem icon={editIcon} onClick={onClick ?? handleManageAccountsMenuItemClick}>
          {translate('accountManagement.menuTitle')}
        </MenuItem>
      )}
    </>
  )
}
