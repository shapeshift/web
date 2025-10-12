import React from 'react'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'

type GridPlusMenuProps = {
  onClose?: () => void
}

export const GridPlusMenu: React.FC<GridPlusMenuProps> = ({ onClose }) => {
  return (
    <>
      <ManageAccountsMenuItem onClose={onClose} />
    </>
  )
}
