import React from 'react'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'

type LedgerMenuProps = {
  onClose?: () => void
}

export const LedgerMenu: React.FC<LedgerMenuProps> = ({ onClose }) => {
  return <ManageAccountsMenuItem onClose={onClose} />
}
