import type { ChainId } from '@shapeshiftoss/caip'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { PartialRecord } from '@shapeshiftoss/types'
import type { Core as TCore } from '@walletconnect/core/dist/types/core'
import type { SessionTypes } from '@walletconnect/types'
import type { PairingTypes } from '@walletconnect/types/dist/types/core/pairing'
import type { IWeb3Wallet, Web3WalletTypes } from '@walletconnect/web3wallet'
import type { Dispatch } from 'react'

export type RegistryItem = {
  category: string
  id: string
  homepage: string
  name: string
  image: string
}

export type APIRegistryItem = {
  app_type: string
  id: string
  homepage: string
  name: string
  image_url: {
    md: string
  }
}

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

export type KnownSigningMethod = EIP155_SigningMethod | CosmosSigningMethod

export interface ModalData<T = WalletConnectRequest> {
  proposal?: Web3WalletTypes.EventArguments['session_proposal']
  requestEvent?: SupportedSessionRequest<T>
  requestSession?: SessionTypes.Struct
  request?: Web3WalletTypes.AuthRequest
}

export type WalletConnectState<T = WalletConnectRequest> = {
  core?: TCore
  web3wallet?: IWeb3Wallet
  pair?: (params: { uri: string }) => Promise<PairingTypes.Struct>
  modalData?: ModalData<T>
  activeModal?: WalletConnectModal
  sessionsByTopic: PartialRecord<string, SessionTypes.Struct>
}

export enum WalletConnectActionType {
  SET_MODAL = 'SET_MODAL',
  CLEAR_MODAL = 'CLEAR_MODAL',
  INITIALIZE = 'INITIALIZE',
  SET_SESSIONS = 'SET_SESSIONS',
  DELETE_SESSION = 'DELETE_SESSION',
  ADD_SESSION = 'ADD_SESSION',
  UPDATE_SESSION = 'UPDATE_SESSION',
}

export type WalletConnectAction =
  | {
      type: WalletConnectActionType.SET_MODAL
      payload: {
        modal: WalletConnectModal
        data: ModalData
      }
    }
  | {
      type: WalletConnectActionType.CLEAR_MODAL
    }
  | {
      type: WalletConnectActionType.INITIALIZE
      payload: {
        core: TCore
        web3wallet: IWeb3Wallet
        pair: WalletConnectState['pair']
      }
    }
  | {
      type: WalletConnectActionType.SET_SESSIONS
      payload: SessionTypes.Struct[]
    }
  | {
      type: WalletConnectActionType.DELETE_SESSION
      payload: Pick<SessionTypes.Struct, 'topic'>
    }
  | {
      type: WalletConnectActionType.UPDATE_SESSION
      payload: Pick<SessionTypes.Struct, 'topic'> & Partial<Omit<SessionTypes.Struct, 'topic'>>
    }
  | {
      type: WalletConnectActionType.ADD_SESSION
      payload: SessionTypes.Struct
    }

export type WalletConnectContextType = {
  state: WalletConnectState
  dispatch: Dispatch<WalletConnectAction>
}

export enum WalletConnectModal {
  SessionProposal = 'sessionProposal',
  SignEIP155MessageConfirmation = 'signEIP155MessageConfirmation',
  SignEIP155TypedDataConfirmation = 'signEIP155TypedDataConfirmation',
  SignEIP155TransactionConfirmation = 'signEIP155TransactionConfirmation',
  SendEIP155TransactionConfirmation = 'sendEIP155TransactionConfirmation',
  SendCosmosTransactionConfirmation = 'sendCosmosTransactionConfirmation',
}

export type CustomTransactionData = {
  nonce?: string
  gas?: string
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
  gasLimit?: string
  gas?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  gasPrice?: string
  value?: string
  nonce?: string
}

// Overwrite Web3WalletTypes.SessionRequest to narrow chainId and request params
export type SupportedSessionRequest<T = WalletConnectRequest> = Omit<
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

type EthSignCallRequestParams = [account: string, message: string]
export type EthSignCallRequest = {
  method: EIP155_SigningMethod.ETH_SIGN
  params: EthSignCallRequestParams
}

export type EthPersonalSignCallRequestParams = [message: string, account: string]
export type EthPersonalSignCallRequest = {
  method: EIP155_SigningMethod.PERSONAL_SIGN
  params: EthPersonalSignCallRequestParams
}

export type CosmosSignDirectCallRequestParams = {
  signerAddress: string
  signDoc: {
    chainId: ChainId
    accountNumber: string
    authInfoBytes: string
    bodyBytes: string
  }
}

export type CosmosSignDirectCallRequest = {
  method: CosmosSigningMethod.COSMOS_SIGN_DIRECT
  params: CosmosSignDirectCallRequestParams
}

export type CosmosSignAminoCallRequestParams = {
  signerAddress: string
  signDoc: {
    chain_id: ChainId
    account_number: string
    sequence: string
    memo: string
    msgs: [type: string, value: string][]
    fee: {
      amount: {
        amount: string
        denom: string
      }[]
      gas: string
    }
  }
}

export type CosmosSignAminoCallRequest = {
  method: CosmosSigningMethod.COSMOS_SIGN_AMINO
  params: CosmosSignAminoCallRequestParams
}

type EthSignTypedDataCallRequestParams = [account: string, message: string]
export type EthSignTypedDataCallRequest = {
  method:
    | EIP155_SigningMethod.ETH_SIGN_TYPED_DATA
    | EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3
    | EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4
  params: EthSignTypedDataCallRequestParams
}

export type WalletConnectRequest =
  | EthSignTransactionCallRequest
  | EthSignCallRequest
  | EthPersonalSignCallRequest
  | EthSignTypedDataCallRequest
  | EthSendTransactionCallRequest
  | CosmosSignDirectCallRequest
  | CosmosSignAminoCallRequest

export type EthSignParams =
  | EthSignCallRequest
  | EthPersonalSignCallRequestParams
  | EthSignTypedDataCallRequest

export type RequestParams =
  | TransactionParams[]
  | EthSignParams
  | CosmosSignDirectCallRequestParams
  | CosmosSignAminoCallRequestParams

export type WalletConnectFeeDataKey = FeeDataKey | 'custom'

export type ConfirmData = {
  nonce?: string
  gasLimit?: string
  speed: WalletConnectFeeDataKey
  customFee?: {
    baseFee: string
    priorityFee: string
  }
}

export type SessionProposalRef = {
  handleReject: () => Promise<void>
}
