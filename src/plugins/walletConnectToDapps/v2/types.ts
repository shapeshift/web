import type { ChainId } from '@shapeshiftoss/caip'
import type { ICore, SessionTypes, SignClientTypes } from '@walletconnect/types'
import type { PairingTypes } from '@walletconnect/types/dist/types/core/pairing'
import type { IWeb3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet'
import type { WalletConnectFeeDataKey } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import type { Dispatch } from 'react'
import { getTypeGuardAssertion } from 'lib/utils'

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

export interface ModalData<T = WalletConnectRequest> {
  proposal?: SignClientTypes.EventArguments['session_proposal']
  requestEvent?: NarrowedSessionRequest<T>
  requestSession?: SessionTypes.Struct
  request?: Web3WalletTypes.AuthRequest
}

export type WalletConnectState<T = WalletConnectRequest> = {
  core?: ICore
  web3wallet?: IWeb3Wallet
  pair?: (params: { uri: string }) => Promise<PairingTypes.Struct>
  modalData?: ModalData<T>
  activeModal?: WalletConnectModal
  session?: SessionTypes.Struct
}

export enum WalletConnectActionType {
  SET_MODAL = 'SET_MODAL',
  CLEAR_MODAL = 'CLEAR_MODAL',
  INITIALIZE = 'INITIALIZE',
  SET_SESSION = 'SET_SESSION',
  DELETE_SESSION = 'DELETE_SESSION',
}

export type WalletConnectAction =
  | {
      type: WalletConnectActionType.SET_MODAL
      payload: { modal: WalletConnectModal; data: ModalData }
    }
  | {
      type: WalletConnectActionType.CLEAR_MODAL
    }
  | {
      type: WalletConnectActionType.INITIALIZE
      payload: { core: ICore; web3wallet: IWeb3Wallet; pair: WalletConnectState['pair'] }
    }
  | {
      type: WalletConnectActionType.SET_SESSION
      payload: { session: SessionTypes.Struct }
    }
  | {
      type: WalletConnectActionType.DELETE_SESSION
    }

export type WalletConnectContextType = {
  state: WalletConnectState
  dispatch: Dispatch<WalletConnectAction>
}

export enum WalletConnectModal {
  sessionProposal = 'sessionProposal',
  signMessageConfirmation = 'signMessageConfirmation',
  signTypedDataConfirmation = 'signTypedDataConfirmation',
  signTransactionConfirmation = 'signTransactionConfirmation',
  sendTransactionConfirmation = 'sendTransactionConfirmation',
}

export type CustomTransactionData = {
  nonce?: string
  gasLimit?: string
  speed: WalletConnectFeeDataKey
  customFee?: {
    baseFee: string
    priorityFee: string
  }
}

export type TransactionParams = {
  from: string
  to: string
  data: string
  gas?: string
  gasPrice?: string
  value?: string
  nonce?: string
}

// Overwrite Web3WalletTypes.SessionRequest to narrow chainId and request params
export type NarrowedSessionRequest<T = WalletConnectRequest> = Omit<
  Web3WalletTypes.SessionRequest,
  'params'
> & {
  params: {
    chainId: ChainId
    request: T
  }
}

export type EthSignTransactionCallRequest = {
  method: EIP155_SigningMethod.ETH_SIGN_TRANSACTION
  params: TransactionParams[]
}

export type EthSendTransactionCallRequest = {
  method: EIP155_SigningMethod.ETH_SEND_TRANSACTION
  params: TransactionParams[]
}

export type EthSignCallRequest = {
  method: EIP155_SigningMethod.ETH_SIGN | EIP155_SigningMethod.PERSONAL_SIGN
  params: [string, string]
}

export type EthSignTypedDataCallRequest = {
  method:
    | EIP155_SigningMethod.ETH_SIGN_TYPED_DATA
    | EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3
    | EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4
  params: [string, string]
}

export type WalletConnectRequest =
  | EthSignTransactionCallRequest
  | EthSignCallRequest
  | EthSignTypedDataCallRequest
  | EthSendTransactionCallRequest

export const isSignRequest = (
  request: WalletConnectRequest,
): request is EthSignCallRequest | EthSignTypedDataCallRequest =>
  [EIP155_SigningMethod.ETH_SIGN, EIP155_SigningMethod.PERSONAL_SIGN].includes(request.method)

export const isSignTypedRequest = (
  request: WalletConnectRequest,
): request is EthSignCallRequest | EthSignTypedDataCallRequest =>
  [
    EIP155_SigningMethod.ETH_SIGN_TYPED_DATA,
    EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3,
    EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4,
  ].includes(request.method)

export const isTransactionRequest = (
  request: WalletConnectRequest,
): request is EthSignTransactionCallRequest | EthSendTransactionCallRequest =>
  [EIP155_SigningMethod.ETH_SIGN_TRANSACTION, EIP155_SigningMethod.ETH_SEND_TRANSACTION].includes(
    request.method,
  )

export const isTransactionParams = (
  transaction: TransactionParams | string | undefined,
): transaction is TransactionParams => typeof transaction !== 'string'

export const assertIsTransactionParams: (
  transaction: TransactionParams | string | undefined,
) => asserts transaction is TransactionParams = getTypeGuardAssertion(
  isTransactionParams,
  'Transaction has no transaction params',
)
