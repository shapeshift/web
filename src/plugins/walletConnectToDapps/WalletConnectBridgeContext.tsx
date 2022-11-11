import type { IClientMeta } from '@walletconnect/types'
import type { WCService } from 'kkdesktop/walletconnect'
import type { WalletConnectCallRequest } from 'kkdesktop/walletconnect/types'
import { createContext, useContext } from 'react'

type WalletConnectBridgeContextValue = {
  bridge: WCService | undefined
  dapp: IClientMeta | undefined
  connect(uri: string): Promise<void>
  removeRequest: (id: number) => void
  requests: WalletConnectCallRequest[]
}

export const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  bridge: undefined,
  dapp: undefined,
  connect: Promise.resolve,
  removeRequest: () => 0,
  requests: [],
})

export function useWalletConnect() {
  return useContext(WalletConnectBridgeContext)
}
