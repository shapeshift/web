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
  // const accountManagementPopover = useModal('accountManagementPopover') // FIXME: uncomment once modal added

  const onBackupMenuItemClick = useCallback(
    () => backupNativePassphrase.open({}),
    [backupNativePassphrase],
  )

  const onManageAccountsMenuItemClick = useCallback(
    () => backupNativePassphrase.open({}),
    [backupNativePassphrase],
  )

  return (
    <>
      <MenuDivider />
      {isAccountManagementEnabled && (
        <MenuItem icon={editIcon} onClick={onManageAccountsMenuItemClick}>
          {translate('manageAccounts.menuTitle')}
        </MenuItem>
      )}
      <MenuItem
        as={Button}
        variant='ghost'
        justifyContent='space-between'
        rightIcon={chevronRightIcon}
        onClick={onBackupMenuItemClick}
      >
        <Text translation='modals.shapeShift.backupPassphrase.menuItem' />
      </MenuItem>
    </>
  )
}
