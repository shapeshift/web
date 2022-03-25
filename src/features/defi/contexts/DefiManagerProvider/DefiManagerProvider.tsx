import { ChainTypes } from '@shapeshiftoss/types'
import { FoxyProvider } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { YearnProvider } from 'features/defi/contexts/YearnProvider/YearnProvider'
import React, { useContext } from 'react'
import { Route, useLocation } from 'react-router-dom'
import { NotFound } from 'pages/NotFound/NotFound'

import { DefiModal } from '../../components/DefiModal/DefiModal'
import { FoxyManager } from '../../providers/foxy/components/FoxyManager/FoxyManager'
import { YearnManager } from '../../providers/yearn/components/YearnManager/YearnManager'

export enum DefiType {
  Pool = 'pool',
  Vault = 'vault',
  Staking = 'staking',
  Farming = 'farming',
  TokenStaking = 'token_staking'
}

export enum DefiProvider {
  Yearn = 'yearn',
  ShapeShift = 'ShapeShift'
}

export enum DefiAction {
  Overview = 'overview',
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
  tokenId: string
  rewardId: string
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
  [DefiProvider.ShapeShift]: FoxyManager
}

export function DefiManagerProvider({ children }: DefiManagerProviderProps) {
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background

  return (
    <DefiManagerContext.Provider value={null}>
      <YearnProvider>
        <FoxyProvider>
          {children}
          {background && (
            <Route
              path='/defi/:earnType/:provider'
              render={({ match: { params } }) => {
                const { provider } = params
                const Module = DefiModules[provider as DefiProvider]
                return <DefiModal>{Module ? <Module /> : <NotFound />}</DefiModal>
              }}
            />
          )}
        </FoxyProvider>
      </YearnProvider>
    </DefiManagerContext.Provider>
  )
}

export function useEarnManager() {
  const context = useContext(DefiManagerContext)
  if (!context) throw new Error("useEarnManager can't be used outside of EarnManagerProvider")
  return context
}
