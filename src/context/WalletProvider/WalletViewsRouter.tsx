import { MemoryRouter } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { NewWalletViewsSwitch } from './NewWalletViews/NewWalletViewsSwitch'
import { WalletViewsSwitch } from './WalletViewsSwitch'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from '@/lib/globals'

export const WalletViewsRouter = () => {
  const isNewWalletFlowEnabled = useFeatureFlag('NewWalletFlow')

  const {
    state: { modal },
  } = useWallet()

  // Do *not* render the modal if it's not opened. Else, effects that shouldn't *will* run and produce bugs.
  if (!modal) return null

  return (
    <MemoryRouter initialIndex={0}>
      <Switch>
        <Route path="*">
          {isNewWalletFlowEnabled && !isMobileApp ? <NewWalletViewsSwitch /> : <WalletViewsSwitch />}
        </Route>
      </Switch>
    </MemoryRouter>
  )
}
