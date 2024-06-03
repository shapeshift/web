import { EditIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'

const editIcon = <EditIcon />
type ManageAccountsMenuItemProps = {
  onClose?: () => void
  displayDivider?: boolean
}

export const ManageAccountsMenuItem: React.FC<ManageAccountsMenuItemProps> = ({
  onClose,
  displayDivider,
}) => {
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')

  const accountManagementPopover = useModal('manageAccounts')

  const handleManageAccountsMenuItemClick = useCallback(() => {
    onClose && onClose()
    accountManagementPopover.open({})
  }, [accountManagementPopover, onClose])

  return (
    <>
      {displayDivider && <MenuDivider />}
      {isAccountManagementEnabled && (
        <MenuItem icon={editIcon} onClick={handleManageAccountsMenuItemClick}>
          {translate('accountManagement.menuTitle')}
        </MenuItem>
      )}
    </>
  )
}
