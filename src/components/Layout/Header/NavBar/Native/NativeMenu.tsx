import { Button, MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { TbDownload } from 'react-icons/tb'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'

const downloadIcon = <TbDownload />

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
      <ManageAccountsMenuItem onClose={onClose} />
      <MenuItem
        as={Button}
        variant='ghost'
        justifyContent='flex-start'
        leftIcon={downloadIcon}
        onClick={handleBackupMenuItemClick}
      >
        <Text translation='modals.shapeShift.backupPassphrase.menuItem' />
      </MenuItem>
    </>
  )
}
