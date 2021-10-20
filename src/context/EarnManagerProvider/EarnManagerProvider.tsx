import { ChainTypes } from '@shapeshiftoss/types'
import React from 'react'
import { Route, useLocation } from 'react-router-dom'

import { EarnModal } from './components/EarnModal/EarnModal'

export enum EarnType {
  Yearn = 'yearn'
}

type EarnManagerProviderProps = {
  children: React.ReactNode
}

type EarnManagerContextProps = {
  open(): void
  close(): void
}

const EarnManagerContext = React.createContext<EarnManagerContextProps | null>(null)

const YearnModule = () => {
  return <div>YEARN ALL DAY BAE</div>
}

const EarnModules = {
  [EarnType.Yearn]: YearnModule
}

export function EarnManagerProvider({ children }: EarnManagerProviderProps) {
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background
  const Module = EarnModules[EarnType.Yearn]

  return (
    <EarnManagerContext.Provider value={null}>
      {children}
      {background && (
        <Route
          path={`/earn/vaults/(${ChainTypes.Ethereum})/:tokenId?`}
          children={
            <EarnModal>
              <Module />
            </EarnModal>
          }
        />
      )}
    </EarnManagerContext.Provider>
  )
}

export function useEarnManager() {
  const context = React.useContext(EarnManagerContext)
  if (!context) throw new Error("useEarnManager can't be used outside of EarnManagerProvider")
  return context
}

// ON USDC PAGE OPPS SECTION
// List of cards
// type EarnRowProps = {
//   active: boolean
//   apy: string
//   symbols: [string, string]
//   name: string
//   earnType: EarnType
// }
// function EarnRow(props: EarnRowProps) {
//   const earnManager = {}
//   history.push('/earn/yearn/vault/:vault-id')
//   return (
//     <div>
//       {/** ... extra ropw info */}
//       {props.active
//         ? <div>$200.00</div>
//         : <button onClick={earnManager.open}>Get Started</button>}
//     <div>
//   )
// }
