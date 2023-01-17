import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import type WalletConnect from '@walletconnect/client'
import type { IClientMeta } from '@walletconnect/types'
import type { ethers } from 'ethers'
import { createContext, useContext } from 'react'

import type { WalletConnectCallRequest } from './bridge/types'

type WalletConnectBridgeContextValue = {
  setWcAccountId: (accountId: AccountId) => void
  chainName: string
  evmChainId: ChainId
  accountExplorerAddressLink: string
  connector: WalletConnect | undefined
  dapp: IClientMeta | null
  connect(uri: string, account: string | null): { successful: boolean } | void
  disconnect(): void
  approveRequest(callRequest: WalletConnectCallRequest, approveData?: unknown): Promise<void>
  rejectRequest(callRequest: WalletConnectCallRequest): void
  wcAccountId: AccountId | undefined
  signMessage(message: string | ethers.utils.Bytes): Promise<string | undefined>
}

export const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  chainName: '',
  evmChainId: 'eip155:1',
  accountExplorerAddressLink: '',
  connector: undefined,
  dapp: null,
  connect: () => {},
  setWcAccountId: Promise.resolve,
  disconnect: Promise.resolve,
  approveRequest: Promise.resolve,
  rejectRequest: Promise.resolve,
  wcAccountId: undefined,
  signMessage: Promise.resolve,
})

export function useWalletConnect() {
  return useContext(WalletConnectBridgeContext)
}
