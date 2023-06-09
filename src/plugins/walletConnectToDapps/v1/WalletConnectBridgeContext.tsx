import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type WalletConnect from '@walletconnect/client'
import type { IClientMeta } from '@walletconnect/legacy-types'
import type { WalletConnectCallRequest } from 'plugins/walletConnectToDapps/v1/bridge/types'
import { createContext, useContext } from 'react'

type WalletConnectBridgeContextValue = {
  setWcAccountId: (accountId: AccountId) => void
  chainName: string | undefined
  evmChainId: ChainId | undefined
  accountExplorerAddressLink: string
  connector: WalletConnect | undefined
  dapp: IClientMeta | null
  connect(uri: string, account: string | null): { successful: boolean } | void
  disconnect(): void
  approveRequest(callRequest: WalletConnectCallRequest, approveData?: unknown): Promise<void>
  rejectRequest(callRequest: WalletConnectCallRequest): void
  wcAccountId: AccountId | undefined
}

export const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  chainName: undefined,
  evmChainId: undefined,
  accountExplorerAddressLink: '',
  connector: undefined,
  dapp: null,
  connect: () => {},
  setWcAccountId: Promise.resolve,
  disconnect: Promise.resolve,
  approveRequest: Promise.resolve,
  rejectRequest: Promise.resolve,
  wcAccountId: undefined,
})

export function useWalletConnect() {
  return useContext(WalletConnectBridgeContext)
}
