import { useCallback } from 'react'
import { ManageAccountsMenuItem } from 'components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { useWallet } from 'hooks/useWallet/useWallet'

import { WalletActions } from '../actions'

type DemoMenuProps = {
  onClose?: () => void
}

export const DemoMenu: React.FC<DemoMenuProps> = ({ onClose }) => {
  const { dispatch: walletDispatch } = useWallet()

  const handleManageAccountsMenuItemClick = useCallback(() => {
    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [walletDispatch])

  return (
    <ManageAccountsMenuItem
      displayDivider={true}
      onClose={onClose}
      onClick={handleManageAccountsMenuItemClick}
    />
  )
}
