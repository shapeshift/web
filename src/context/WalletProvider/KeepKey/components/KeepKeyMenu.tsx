import { EditIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuItem } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'

const editIcon = <EditIcon />

export const KeepKeyConnectedMenuItems = () => {
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')

  const accountManagementPopover = useModal('backupNativePassphrase') // FIXME: use accountManagementPopover once ready

  const handleManageAccountsMenuItemClick = useCallback(
    () => accountManagementPopover.open({}),
    [accountManagementPopover],
  )

  return (
    <>
      <MenuDivider />
      {isAccountManagementEnabled && (
        <MenuItem icon={editIcon} onClick={handleManageAccountsMenuItemClick}>
          {translate('manageAccounts.menuTitle')}
        </MenuItem>
      )}
    </>
  )
}
