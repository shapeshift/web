import React from 'react'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'

type GridPlusMenuProps = {
  onClose?: () => void
}

// TODO: Rename from Ledger vernacular to wallet-agnostic terms
export const GridPlusMenu: React.FC<GridPlusMenuProps> = ({ onClose }) => {
  return (
    <>
      <ManageAccountsMenuItem onClose={onClose} />
    </>
  )
}
