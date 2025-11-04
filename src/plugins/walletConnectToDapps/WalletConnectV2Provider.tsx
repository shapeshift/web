import type { FC, PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletConnectEventsManager } from '@/plugins/walletConnectToDapps/eventsManager/useWalletConnectEventsManager'
import { useWalletConnectDeepLink } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectDeepLink'
import type {
  WalletConnectContextType,
  WalletConnectState,
} from '@/plugins/walletConnectToDapps/types'
import { WalletConnectActionType } from '@/plugins/walletConnectToDapps/types'
import { clearAllWalletConnectToDappsSessions } from '@/plugins/walletConnectToDapps/utils/clearAllWalletConnectToDappsSessions'
import { WalletConnectModalManager } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { walletConnectReducer } from '@/plugins/walletConnectToDapps/walletConnectReducer'
import {
  getWalletConnectCore,
  getWalletConnectWallet,
} from '@/plugins/walletConnectToDapps/walletUtils'

const WalletConnectContext = createContext<WalletConnectContextType | undefined>(undefined)

const initialState: WalletConnectState = Object.freeze({
  core: undefined,
  web3wallet: undefined,
  pair: undefined,
  modalData: undefined,
  activeModal: undefined,
  sessionsByTopic: {},
})

export const WalletConnectV2Provider: FC<PropsWithChildren> = ({ children }) => {
  const previousWalletId = useRef<string>(undefined)

  const {
    state: { walletInfo },
  } = useWallet()

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

  useWalletConnectEventsManager(state, dispatch)

  // Handle deep links for WalletConnect URIs from /wc route
  useWalletConnectDeepLink(state)

  useEffect(() => {
    const activeSessions = state.web3wallet?.getActiveSessions()
    const sessions = activeSessions ? Object.values(activeSessions) : []
    if (sessions.length) {
      dispatch({ type: WalletConnectActionType.SET_SESSIONS, payload: sessions })
    }
  }, [state.core?.pairing, state.web3wallet])

  useEffect(() => {
    // NOTE: don't use `useAppSelector(selectWalletId)` because it introduces a race condition
    const deviceId = walletInfo?.deviceId

    if (!previousWalletId.current && deviceId) {
      previousWalletId.current = deviceId
    } else if (deviceId && previousWalletId.current !== deviceId) {
      // clear wallet connect sessions on wallet change
      void clearAllWalletConnectToDappsSessions()
      dispatch({ type: WalletConnectActionType.SET_SESSIONS, payload: [] })

      // update ref
      previousWalletId.current = deviceId
    }
  }, [walletInfo?.deviceId, walletInfo?.name])

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
