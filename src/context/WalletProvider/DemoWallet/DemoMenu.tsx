import { EditIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuItem } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'

import { WalletActions } from '../actions'

const editIcon = <EditIcon />

export const DemoMenu = () => {
  const translate = useTranslate()
  const { dispatch: walletDispatch } = useWallet()
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')

  const handleManageAccountsMenuItemClick = useCallback(() => {
    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [walletDispatch])

  return (
    <>
      {isAccountManagementEnabled && (
        <>
          <MenuDivider />
          <MenuItem icon={editIcon} onClick={handleManageAccountsMenuItemClick}>
            {translate('manageAccounts.menuTitle')}
          </MenuItem>
        </>
      )}
    </>
  )
}
