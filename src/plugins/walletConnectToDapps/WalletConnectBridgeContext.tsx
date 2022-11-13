import type { ChainReference } from '@shapeshiftoss/caip'
import type {
  HDWalletWCBridge,
  WalletConnectCallRequest,
} from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import type { IClientMeta } from '@walletconnect/types'
import { createContext, useContext } from 'react'

type WalletConnectBridgeContextValue = {
  chainName: string
  ethChainId: ChainReference
  bridge: HDWalletWCBridge | undefined
  dapp: IClientMeta | undefined
  callRequests: WalletConnectCallRequest[]
  connect(uri: string, account: string | null): Promise<void>
  disconnect(): Promise<void>
  approveRequest(callRequest: WalletConnectCallRequest, approveData?: unknown): Promise<void>
  rejectRequest(callRequest: WalletConnectCallRequest): Promise<void>
}

export const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  chainName: '',
  ethChainId: '1',
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
