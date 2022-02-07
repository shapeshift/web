import { ChainTypes } from '@shapeshiftoss/types'
import { YearnProvider } from 'features/defi/contexts/YearnProvider/YearnProvider'
import React, { useContext } from 'react'
import { Route, useLocation } from 'react-router-dom'
import { NotFound } from 'pages/NotFound/NotFound'

import { DefiModal } from '../../components/DefiModal/DefiModal'
import { CosmosSdkManager } from '../../providers/cosmosSdk/components/CosmosSdkManager/CosmosSdkManager'
import { YearnManager } from '../../providers/yearn/components/YearnManager/YearnManager'

export enum DefiType {
  Pool = 'pool',
  Vault = 'vault',
  Staking = 'staking',
  Farming = 'farming'
}

export enum DefiProvider {
  Yearn = 'yearn',
  CosmosSdk = 'cosmos'
}

export enum DefiAction {
  Deposit = 'deposit',
  Withdraw = 'withdraw',
  GetStarted = 'get-started'
}

export type DefiParams = {
  provider: DefiProvider
  earnType: DefiType
  action: DefiAction
}

export type DefiQueryParams = {
  chain: ChainTypes
  contractAddress: string
  tokenId?: string
}

type DefiManagerProviderProps = {
  children: React.ReactNode
}

type DefiManagerContextProps = {
  open(): void
  close(): void
}

const DefiManagerContext = React.createContext<DefiManagerContextProps | null>(null)

const DefiModules = {
  [DefiProvider.Yearn]: YearnManager,
  [DefiProvider.CosmosSdk]: CosmosSdkManager
}

export function DefiManagerProvider({ children }: DefiManagerProviderProps) {
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background

  return (
    <DefiManagerContext.Provider value={null}>
      <YearnProvider>
        {children}
        {background && (
          <Route
            path='/defi/:earnType/:provider/:action'
            render={({ match: { params } }) => {
              const { provider } = params
              const Module = DefiModules[provider as DefiProvider]
              return <DefiModal>{Module ? <Module /> : <NotFound />}</DefiModal>
            }}
          />
        )}
      </YearnProvider>
    </DefiManagerContext.Provider>
  )
}

export function useEarnManager() {
  const context = useContext(DefiManagerContext)
  if (!context) throw new Error("useEarnManager can't be used outside of EarnManagerProvider")
  return context
}
