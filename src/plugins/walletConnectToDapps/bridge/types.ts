import type { ETHSignMessage, ETHSignTx } from '@shapeshiftoss/hdwallet-core'

export type WalletConnectSessionRequestPayload = {
  params: {
    chainId: number
  }[]
}
export type WalletConnectEthSignCallRequest = {
  id: number
  method: 'eth_sign'
  params: [string, string]
}

export type WalletConnectEthSignTypedDataCallRequest = {
  id: number
  method: 'eth_signTypedData'
  params: [string, string]
}

export type WalletConnectPersonalSignCallRequest = {
  id: number
  method: 'personal_sign'
  params: [string, string]
}

export type WalletConnectEthSendTransactionCallRequest = {
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

export type WalletConnectEthSignTransactionCallRequest = {
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

export type WalletConnectSessionRequest = {
  id: number
  method: 'wc_sessionRequest'
  params: {
    peerId: string
    peerMeta: {
      description: string
      url: string
      icons: string[]
      name: string
    }
    chainId: unknown
  }[]
}

export type WalletConnectCallRequest =
  | WalletConnectEthSignCallRequest
  | WalletConnectEthSignTypedDataCallRequest
  | WalletConnectPersonalSignCallRequest
  | WalletConnectEthSendTransactionCallRequest
  | WalletConnectEthSignTransactionCallRequest
  | WalletConnectSessionRequest

export type WalletConnectCallRequestResponseMap = {
  personal_sign: ETHSignMessage
  eth_sendTransaction: ETHSignTx
  eth_signTransaction: ETHSignTx
}
