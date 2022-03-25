import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { WalletViewsSwitch } from './WalletViewsSwitch'

export const WalletViewsRouter = () => {
  return (
    <MemoryRouter initialIndex={0}>
      <WalletViewsSwitch />
    </MemoryRouter>
  )
}
