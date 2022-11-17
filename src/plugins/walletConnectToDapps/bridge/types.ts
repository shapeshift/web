import type { ETHSignMessage, ETHSignTx } from '@shapeshiftoss/hdwallet-core'

export interface WalletConnectSessionRequestPayload {
  params: {
    chainId: number
  }[]
}
export interface WalletConnectEthSignCallRequest {
  id: number
  method: 'eth_sign'
  params: [string, string]
}

export interface WalletConnectEthSignTypedDataCallRequest {
  id: number
  method: 'eth_signTypedData'
  params: [string, unknown]
}

export interface WalletConnectPersonalSignCallRequest {
  id: number
  method: 'personal_sign'
  params: [string, string]
}

export interface WalletConnectEthSendTransactionCallRequest {
  id: number
  method: 'eth_sendTransaction'
  params: {
    from: string
    to: string
    data: string
    gas: string
    gasPrice: string
    value: string
    nonce: string
  }[]
}

export interface WalletConnectEthSignTransactionCallRequest {
  id: number
  method: 'eth_signTransaction'
  params: {
    from: string
    to: string
    data: string
    gas: string
    gasPrice: string
    value: string
    nonce: string
  }[]
}

export type WalletConnectCallRequest =
  | WalletConnectEthSignCallRequest
  | WalletConnectEthSignTypedDataCallRequest
  | WalletConnectPersonalSignCallRequest
  | WalletConnectEthSendTransactionCallRequest
  | WalletConnectEthSignTransactionCallRequest

export type WalletConnectCallRequestResponseMap = {
  personal_sign: ETHSignMessage
  eth_sendTransaction: ETHSignTx
  eth_signTransaction: ETHSignTx
}
