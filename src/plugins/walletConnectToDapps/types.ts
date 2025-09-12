import type { IWalletKit, WalletKitTypes } from '@reown/walletkit'
import type { ChainId } from '@shapeshiftoss/caip'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { PartialRecord } from '@shapeshiftoss/types'
import type WalletConnectCore from '@walletconnect/core'
import type { PairingTypes, SessionTypes } from '@walletconnect/types'
import type { TypedData, TypedDataDomain } from 'abitype'
import type { Dispatch } from 'react'
import type { Address, Hex } from 'viem'

export enum EIP155_SigningMethod {
  PERSONAL_SIGN = 'personal_sign',
  ETH_SIGN = 'eth_sign',
  ETH_SIGN_TRANSACTION = 'eth_signTransaction',
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4',
  ETH_SEND_TRANSACTION = 'eth_sendTransaction',
  // The app has no notion of adding a chain, or "active" chain for that matter
  // So just assume this is supported so we don't error in case a dApp is trying to add a chain
  WALLET_ADD_ETHEREUM_CHAIN = 'wallet_addEthereumChain',
  WALLET_SWITCH_ETHEREUM_CHAIN = 'wallet_switchEthereumChain',
  GET_CAPABILITIES = 'wallet_getCapabilities',
}

export enum CosmosSigningMethod {
  COSMOS_SIGN_DIRECT = 'cosmos_signDirect',
  COSMOS_SIGN_AMINO = 'cosmos_signAmino',
}

export type KnownSigningMethod = EIP155_SigningMethod | CosmosSigningMethod

export interface ModalData<T = WalletConnectRequest> {
  proposal?: WalletKitTypes.EventArguments['session_proposal']
  requestEvent?: SupportedSessionRequest<T>
  requestSession?: SessionTypes.Struct
  request?: WalletKitTypes.EventArguments['session_authenticate']
}

export type WalletConnectState<T = WalletConnectRequest> = {
  core?: WalletConnectCore
  web3wallet?: IWalletKit
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
        core: WalletConnectCore
        web3wallet: IWalletKit
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
  speed: FeeDataKey
}

export type TransactionParams = {
  from: Address
  to: Address
  data: Hex
  gasLimit?: Hex
  gas?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  gasPrice?: string
  value?: Hex
  nonce?: Hex
}

// Overwrite Web3WalletTypes.SessionRequest to narrow chainId and request params
export type SupportedSessionRequest<T = WalletConnectRequest> = Omit<
  WalletKitTypes.SessionRequest,
  'params'
> & {
  params: {
    chainId: ChainId
    request: T
  }
}

type WalletAddEthereumChainCallRequest = {
  method: EIP155_SigningMethod.WALLET_ADD_ETHEREUM_CHAIN
  params: TransactionParams[]
}

type WalletSwitchEthereumChainCallRequest = {
  method: EIP155_SigningMethod.WALLET_SWITCH_ETHEREUM_CHAIN
  params: TransactionParams[]
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
  | WalletSwitchEthereumChainCallRequest
  | WalletAddEthereumChainCallRequest
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

export type ConfirmData = {
  nonce?: string
  gasLimit?: string
  speed: FeeDataKey
}

export type SessionProposalRef = {
  handleReject: () => Promise<void>
}

export type EIP712Value = string | number | boolean | (string | number | boolean)[] | null

export type EIP712TypedData = {
  domain: TypedDataDomain
  types: TypedData
  primaryType: string
  message: Record<string, EIP712Value>
}
