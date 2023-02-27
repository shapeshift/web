import { useWalletConnectEventsManager } from 'plugins/walletConnectToDapps/v2/eventsManager/useWalletConnectEventsManager'
import type {
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectModalManager } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import { walletConnectReducer } from 'plugins/walletConnectToDapps/v2/walletConnectReducer'
import {
  getWalletConnectCore,
  getWalletConnectWallet,
} from 'plugins/walletConnectToDapps/v2/walletUtils'
import type { FC, PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

const WalletConnectContext = createContext<WalletConnectContextType | undefined>(undefined)

export const WalletConnectV2Provider: FC<PropsWithChildren> = ({ children }) => {
  const initialState: WalletConnectState = {
    core: undefined,
    web3wallet: undefined,
    pair: undefined,
    modalData: undefined,
    activeModal: undefined,
    session: undefined,
  }

  const [state, dispatch] = useReducer(walletConnectReducer, initialState)

  useEffect(() => {
    ;(async () => {
      const core = getWalletConnectCore()
      const web3wallet = await getWalletConnectWallet()
      const pair = async (params: { uri: string }) => {
        return await core.pairing.pair({ uri: params.uri })
      }
      dispatch({ type: WalletConnectActionType.INITIALIZE, payload: { core, web3wallet, pair } })
    })()
  }, [])

  const isInitialized = !!state.core && !!state.web3wallet
  useWalletConnectEventsManager(isInitialized, state.web3wallet, dispatch, state.core)

  useEffect(() => {
    const activeSessions = state.web3wallet?.getActiveSessions()
    const sessions = activeSessions ? Object.values(activeSessions) : []
    if (sessions?.length) {
      // Load the most recent session
      const session = sessions[sessions.length - 1]
      ;(async () => {
        // Reactivate the session
        await state.core?.pairing.activate({ topic: session.topic })
        await state.web3wallet?.extendSession({ topic: session.topic })
      })()
      // TODO: handle multiple sessions
      dispatch({ type: WalletConnectActionType.SET_SESSION, payload: session })
    }
  }, [state.core?.pairing, state.web3wallet])

  const value: WalletConnectContextType = useMemo(() => ({ state, dispatch }), [state])
  return (
    <WalletConnectContext.Provider value={value}>
      {children}
      <WalletConnectModalManager state={state} dispatch={dispatch} />
    </WalletConnectContext.Provider>
  )
}

export function useWalletConnectV2() {
  const context = useContext(WalletConnectContext)
  if (context === undefined) {
    throw new Error('useWalletConnectV2 must be used within a WalletConnectV2Provider')
  }

  return { ...context.state, dispatch: context.dispatch }
}
