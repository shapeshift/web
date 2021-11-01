import { ChainTypes } from '@shapeshiftoss/types'
import qs from 'qs'
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

export type EarnQueryParams = {
  provider: EarnProvider
  chain: ChainTypes
  action: 'deposit' | 'withdraw'
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
        <>
          <Route
            path='/earn/(vault|pool|staking)'
            render={props => {
              const { provider } = qs.parse(props.location.search)
              const Module = EarnModules[provider as EarnProvider]
              return <EarnModal>{Module ? <Module /> : <NotFound />}</EarnModal>
            }}
          />
        </>
      )}
    </EarnManagerContext.Provider>
  )
}

export function useEarnManager() {
  const context = useContext(EarnManagerContext)
  if (!context) throw new Error("useEarnManager can't be used outside of EarnManagerProvider")
  return context
}
