import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, MenuDivider, MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { AccountsManagementMenuItem } from 'components/Layout/Header/NavBar/AccountsManagementMenuItem'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

const chevronRightIcon = <ChevronRightIcon />
type NativeMenuProps = {
  onClose?: () => void
}

export const NativeMenu: React.FC<NativeMenuProps> = ({ onClose }) => {
  const backupNativePassphrase = useModal('backupNativePassphrase')

  const handleBackupMenuItemClick = useCallback(() => {
    onClose && onClose()
    backupNativePassphrase.open({})
  }, [backupNativePassphrase, onClose])

  return (
    <>
      <MenuDivider />
      <AccountsManagementMenuItem onClose={onClose} />
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
