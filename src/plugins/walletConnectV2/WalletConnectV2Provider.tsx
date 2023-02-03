import type { WalletConnectContextType } from 'plugins/walletConnectV2/types'
import { WalletConnectActionType } from 'plugins/walletConnectV2/types'
import { useWalletConnectEventsManager } from 'plugins/walletConnectV2/useWalletConnectEventsManager'
import { walletConnectReducer } from 'plugins/walletConnectV2/walletConnectReducer'
import { getWalletConnectCore, getWalletConnectWallet } from 'plugins/walletConnectV2/walletUtils'
import type { FC, PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

const WalletConnectContext = createContext<WalletConnectContextType | undefined>(undefined)

export const WalletConnectV2Provider: FC<PropsWithChildren> = ({ children }) => {
  console.log('[debug] WalletConnectV2Provider')

  const initialState = {
    core: undefined,
    web3wallet: undefined,
    pair: undefined,
    modalData: undefined,
    activeModal: undefined,
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
  useWalletConnectEventsManager(isInitialized, state.web3wallet, dispatch)

  const value: WalletConnectContextType = useMemo(() => ({ state, dispatch }), [state])
  return <WalletConnectContext.Provider value={value}>{children}</WalletConnectContext.Provider>
}

export function useWalletConnectV2() {
  const context = useContext(WalletConnectContext)
  if (context === undefined) {
    throw new Error('useWalletConnectV2 must be used within a WalletConnectV2Provider')
  }

  console.log('[debug] context', context)

  return { ...context.state, dispatch: context.dispatch }
}
