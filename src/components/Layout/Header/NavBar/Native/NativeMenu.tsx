import { ChevronRightIcon, EditIcon } from '@chakra-ui/icons'
import { Button, MenuDivider, MenuItem } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'

const chevronRightIcon = <ChevronRightIcon />
const editIcon = <EditIcon />

export const NativeMenu = () => {
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')

  const backupNativePassphrase = useModal('backupNativePassphrase')
  const accountManagementPopover = useModal('manageAccounts')

  const handleBackupMenuItemClick = useCallback(
    () => backupNativePassphrase.open({}),
    [backupNativePassphrase],
  )

  const handleManageAccountsMenuItemClick = useCallback(
    () => accountManagementPopover.open({ title: translate('manageAccounts.modalTitle') }),
    [accountManagementPopover, translate],
  )

  return (
    <>
      <MenuDivider />
      {isAccountManagementEnabled && (
        <MenuItem icon={editIcon} onClick={handleManageAccountsMenuItemClick}>
          {translate('accountManagement.menuTitle')}
        </MenuItem>
      )}
      <MenuItem
        as={Button}
        variant='ghost'
        justifyContent='space-between'
        rightIcon={chevronRightIcon}
        onClick={handleBackupMenuItemClick}
      >
        <Text translation='modals.shapeShift.backupPassphrase.menuItem' />
      </MenuItem>
    </>
  )
}
