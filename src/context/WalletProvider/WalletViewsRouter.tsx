import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { WalletViewsSwitch } from './WalletViewsSwitch'

export type WalletViewProps = {
  type: string | null
  modalOpen: boolean
  connect: (adapter: string) => Promise<void>
  routePath?: string | readonly string[] | undefined
}

export const WalletViewsRouter = (props: WalletViewProps) => {
  return (
    <MemoryRouter initialIndex={0}>
      <WalletViewsSwitch {...props} />
    </MemoryRouter>
  )
}
