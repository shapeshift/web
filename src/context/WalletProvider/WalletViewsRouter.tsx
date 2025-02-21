import { MemoryRouter } from 'react-router-dom'
import { isMobile as isMobileApp } from 'lib/globals'

import { NewWalletViewsSwitch } from './NewWalletViews/NewWalletViewsSwitch'
import { WalletViewsSwitch } from './WalletViewsSwitch'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const WalletViewsRouter = () => {
  const isNewWalletFlowEnabled = useFeatureFlag('NewWalletFlow')

  const {
    state: { modal },
  } = useWallet()

  // Do *not* render the modal if it's not opened. Else, effects that shouldn't *will* run and produce bugs.
  if (!modal) return null

  return (
    <MemoryRouter initialIndex={0}>
      {isNewWalletFlowEnabled && !isMobileApp ? <NewWalletViewsSwitch /> : <WalletViewsSwitch />}
    </MemoryRouter>
  )
}
