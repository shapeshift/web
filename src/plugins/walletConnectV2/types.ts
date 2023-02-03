import type { ICore, SessionTypes, SignClientTypes } from '@walletconnect/types'
import type { PairingTypes } from '@walletconnect/types/dist/types/core/pairing'
import type { IWeb3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet'

export enum EIP155_SigningMethod {
  PERSONAL_SIGN = 'personal_sign',
  ETH_SIGN = 'eth_sign',
  ETH_SIGN_TRANSACTION = 'eth_signTransaction',
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4',
  ETH_SEND_TRANSACTION = 'eth_sendTransaction',
}

export enum CosmosSigningMethod {
  COSMOS_SIGN_DIRECT = 'cosmos_signDirect',
  COSMOS_SIGN_AMINO = 'cosmos_signAmino',
}

interface ModalData {
  proposal?: SignClientTypes.EventArguments['session_proposal']
  requestEvent?: SignClientTypes.EventArguments['session_request']
  requestSession?: SessionTypes.Struct
  request?: Web3WalletTypes.AuthRequest
}

export interface WalletConnect {
  core: ICore
  web3wallet: IWeb3Wallet
  pair: (params: { uri: string }) => Promise<PairingTypes.Struct>
  data?: ModalData
}
