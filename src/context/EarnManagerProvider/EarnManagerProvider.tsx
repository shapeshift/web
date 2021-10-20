import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import React from 'react'
import { Route, useHistory, useLocation } from 'react-router-dom'

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
  const history = useHistory()
  return (
    <Modal isOpen onClose={history.goBack}>
      <ModalOverlay />
      <ModalContent>YEARN MODULE</ModalContent>
    </Modal>
  )
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
          path={`/earn/vaults/(${ChainTypes.Ethereum})/(${NetworkTypes.MAINNET})/:tokenId?`}
          children={<Module />}
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
