import type { HDWalletWCBridge } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import type { WalletConnectCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge/dist/types'
import type { IClientMeta } from '@walletconnect/types'
import { createContext, useContext } from 'react'

type WalletConnectBridgeContextValue = {
  bridge: HDWalletWCBridge | undefined
  dapp: IClientMeta | undefined
  callRequests: WalletConnectCallRequest[]
  connect(uri: string): Promise<void>
  disconnect(): Promise<void>
  approveRequest(callRequest: WalletConnectCallRequest): Promise<void>
  rejectRequest(callRequest: WalletConnectCallRequest): Promise<void>
}

export const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  bridge: undefined,
  dapp: undefined,
  callRequests: [],
  connect: Promise.resolve,
  disconnect: Promise.resolve,
  approveRequest: Promise.resolve,
  rejectRequest: Promise.resolve,
})

export function useWalletConnect() {
  return useContext(WalletConnectBridgeContext)
}
