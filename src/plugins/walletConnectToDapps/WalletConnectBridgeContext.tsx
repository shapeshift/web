import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type WalletConnect from '@walletconnect/client'
import type { IClientMeta } from '@walletconnect/types'
import { createContext, useContext } from 'react'

import type { WalletConnectCallRequest } from './bridge/types'

type WalletConnectBridgeContextValue = {
  setWcAccountId: (accountId: AccountId) => void
  chainName: string
  evmChainId: ChainId
  accountExplorerAddressLink: string
  connector: WalletConnect | undefined
  dapp: IClientMeta | null
  // callRequests: WalletConnectCallRequest[]
  connect(uri: string, account: string | null): void
  disconnect(): Promise<void>
  approveRequest(callRequest: WalletConnectCallRequest, approveData?: unknown): Promise<void>
  rejectRequest(callRequest: WalletConnectCallRequest): void
  wcAccountId: AccountId | undefined
}

export const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  chainName: '',
  evmChainId: 'eip155:1',
  accountExplorerAddressLink: '',
  connector: undefined,
  dapp: null,
  // callRequests: [],
  connect: Promise.resolve,
  setWcAccountId: Promise.resolve,
  disconnect: Promise.resolve,
  approveRequest: Promise.resolve,
  rejectRequest: Promise.resolve,
  wcAccountId: undefined,
})

export function useWalletConnect() {
  return useContext(WalletConnectBridgeContext)
}
