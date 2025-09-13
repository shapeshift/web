import { Button, MenuDivider, MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { TbDownload, TbEdit, TbTrash } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

const downloadIcon = <TbDownload />
const editIcon = <TbEdit />
const deleteIcon = <TbTrash />

type NativeMenuProps = {
  onClose?: () => void
}

export const NativeMenu: React.FC<NativeMenuProps> = ({ onClose }) => {
  const backupNativePassphrase = useModal('backupNativePassphrase')
  const translate = useTranslate()
  const { dispatch } = useWallet()

  const handleBackupMenuItemClick = useCallback(() => {
    onClose && onClose()
    backupNativePassphrase.open({})
  }, [backupNativePassphrase, onClose])

  const handleRenameClick = useCallback(() => {
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: NativeWalletRoutes.Rename,
    })

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

    onClose && onClose()
  }, [dispatch, onClose])

  const handleDeleteClick = useCallback(() => {
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: NativeWalletRoutes.Delete,
    })

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

    onClose && onClose()
  }, [dispatch, onClose])

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
