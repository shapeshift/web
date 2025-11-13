import React from 'react'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'

type TrezorMenuProps = {
  onClose?: () => void
}

export const TrezorMenu: React.FC<TrezorMenuProps> = ({ onClose }) => {
  return <ManageAccountsMenuItem onClose={onClose} />
}
