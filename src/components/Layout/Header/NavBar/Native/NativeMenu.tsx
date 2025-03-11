import { Button, MenuDivider, MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { TbDownload, TbEdit, TbTrash } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'

const downloadIcon = <TbDownload />
const editIcon = <TbEdit />
const deleteIcon = <TbTrash />

type NativeMenuProps = {
  onClose?: () => void
}

export const NativeMenu: React.FC<NativeMenuProps> = ({ onClose }) => {
  const backupNativePassphrase = useModal('backupNativePassphrase')
  const translate = useTranslate()

  const handleBackupMenuItemClick = useCallback(() => {
    onClose && onClose()
    backupNativePassphrase.open({})
  }, [backupNativePassphrase, onClose])

  const handleRenameClick = useCallback(() => {
    onClose && onClose()
  }, [onClose])

  const handleDeleteClick = useCallback(() => {
    onClose && onClose()
  }, [onClose])

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
      <MenuDivider />
      <MenuItem
        as={Button}
        variant='ghost'
        justifyContent='flex-start'
        leftIcon={editIcon}
        onClick={handleRenameClick}
      >
        {translate('walletProvider.shapeShift.rename.header')}
      </MenuItem>
      <MenuItem
        as={Button}
        variant='ghost'
        justifyContent='flex-start'
        leftIcon={deleteIcon}
        onClick={handleDeleteClick}
      >
        {translate('walletProvider.shapeShift.delete.header')}
      </MenuItem>
    </>
  )
}
