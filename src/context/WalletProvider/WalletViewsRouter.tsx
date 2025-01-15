import { MemoryRouter } from 'react-router-dom'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { NewWalletViewsSwitch } from './NewWalletViewsSwitch'
import { WalletViewsSwitch } from './WalletViewsSwitch'

export const WalletViewsRouter = () => {
  const isNewWalletFlowEnabled = useFeatureFlag('NewWalletFlow')

  return (
    <MemoryRouter initialIndex={0}>
      {isNewWalletFlowEnabled ? <NewWalletViewsSwitch /> : <WalletViewsSwitch />}
    </MemoryRouter>
  )
}
