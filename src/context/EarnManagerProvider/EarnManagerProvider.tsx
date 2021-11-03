import { ChainTypes } from '@shapeshiftoss/types'
import React, { useContext } from 'react'
import { Route, useLocation } from 'react-router-dom'
import { NotFound } from 'pages/NotFound/NotFound'

import { EarnModal } from './components/EarnModal/EarnModal'
import { YearnManager } from './providers/yearn/components/YearnManager/YearnManager'

export enum EarnType {
  Pool = 'pool',
  Vault = 'vault',
  Staking = 'staking',
  Farming = 'farming'
}

export enum EarnProvider {
  Yearn = 'yearn'
}

export enum EarnAction {
  Deposit = 'deposit',
  Withdraw = 'withdraw'
}

export type EarnParams = {
  provider: EarnProvider
  earnType: EarnType
  action: EarnAction
}

export type EarnQueryParams = {
  chain: ChainTypes
  contractAddress: string
  tokenId?: string
}

type EarnManagerProviderProps = {
  children: React.ReactNode
}

type EarnManagerContextProps = {
  open(): void
  close(): void
}

const EarnManagerContext = React.createContext<EarnManagerContextProps | null>(null)

const EarnModules = {
  [EarnProvider.Yearn]: YearnManager
}

export function EarnManagerProvider({ children }: EarnManagerProviderProps) {
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background

  return (
    <EarnManagerContext.Provider value={null}>
      {children}
      {background && (
        <Route
          path='/earn/:earnType/:provider/:action'
          render={({ match: { params } }) => {
            const { provider } = params
            const Module = EarnModules[provider as EarnProvider]
            return <EarnModal>{Module ? <Module /> : <NotFound />}</EarnModal>
          }}
        />
      )}
    </EarnManagerContext.Provider>
  )
}

export function useEarnManager() {
  const context = useContext(EarnManagerContext)
  if (!context) throw new Error("useEarnManager can't be used outside of EarnManagerProvider")
  return context
}
