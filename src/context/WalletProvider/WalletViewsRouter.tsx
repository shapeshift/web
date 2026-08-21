import { MemoryRouter } from 'react-router-dom'

import { WalletViewsSwitch } from './WalletViews/WalletViewsSwitch'

import { useWallet } from '@/hooks/useWallet/useWallet'

export const WalletViewsRouter = () => {
  const {
    state: { modal },
  } = useWallet()

  // Do *not* render the modal if it's not opened. Else, effects that shouldn't *will* run and produce bugs.
  if (!modal) return null

  return (
    <MemoryRouter initialIndex={0}>
      <WalletViewsSwitch />
    </MemoryRouter>
  )
}
