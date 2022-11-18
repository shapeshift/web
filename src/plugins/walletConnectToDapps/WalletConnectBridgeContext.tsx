import type { ChainId } from '@shapeshiftoss/caip'
import type { IClientMeta } from '@walletconnect/types'
import { createContext, useContext } from 'react'

import type { WalletConnectCallRequest } from './bridge/types'
import type { WalletConnectBridge } from './bridge/WalletConnectBridge'

type WalletConnectBridgeContextValue = {
  chainName: string
  evmChainId: ChainId
  accountExplorerAddressLink: string
  bridge: WalletConnectBridge | undefined
  dapp: IClientMeta | undefined
  callRequests: WalletConnectCallRequest[]
  connect(uri: string, account: string | null): Promise<void>
  disconnect(): Promise<void>
  approveRequest(callRequest: WalletConnectCallRequest, approveData?: unknown): Promise<void>
  rejectRequest(callRequest: WalletConnectCallRequest): Promise<void>
}

export const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  chainName: '',
  evmChainId: 'eip155:1',
  accountExplorerAddressLink: '',
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
