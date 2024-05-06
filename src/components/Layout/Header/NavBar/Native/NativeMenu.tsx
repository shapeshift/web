import { ChevronRightIcon, EditIcon } from '@chakra-ui/icons'
import { Button, MenuDivider, MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'

const chevronRightIcon = <ChevronRightIcon />
const editIcon = <EditIcon />
type NativeMenuProps = {
  onClose?: () => void
}

export const NativeMenu: React.FC<NativeMenuProps> = ({ onClose }) => {
  const translate = useTranslate()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')

  const backupNativePassphrase = useModal('backupNativePassphrase')
  const accountManagementPopover = useModal('manageAccounts')

  const handleBackupMenuItemClick = useCallback(() => {
    onClose && onClose()
    backupNativePassphrase.open({})
  }, [backupNativePassphrase, onClose])

  const handleManageAccountsMenuItemClick = useCallback(() => {
    onClose && onClose()
    accountManagementPopover.open({})
  }, [accountManagementPopover, onClose])

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
