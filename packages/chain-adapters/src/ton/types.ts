import type { AssetId } from '@shapeshiftoss/caip'
import type { BIP32Path } from '@shapeshiftoss/hdwallet-core'

import type * as types from '../types'

export type TonToken = types.AssetBalance & {
  assetId: AssetId
  symbol: string
  name: string
  precision: number
}

export type TonAccount = {
  tokens?: TonToken[]
}

export type BuildTxInput = {
  memo?: string
  contractAddress?: string
}

export type TonGetFeeDataInput = {
  from: string
  memo?: string
  contractAddress?: string
}

export type TonFeeData = {
  gasPrice: string
  forwardFee?: string
  storageFee?: string
}

export type TonRawMessage = {
  targetAddress: string
  sendAmount: string
  payload: string
  stateInit?: string
}

export type TonSignTx = {
  addressNList: BIP32Path
  message?: Uint8Array | Buffer
  rawMessages?: TonRawMessage[]
  seqno?: number
  expireAt?: number
}

export type TonTxMessage = {
  hash?: string
  source?: string
  destination?: string
  value?: string
  message_content?: {
    decoded?: {
      '@type'?: string
      ton_amount?: {
        amount?: {
          value?: string
        }
      }
    }
  }
}

export type TonTx = {
  account: string
  hash: string
  lt: string
  now: number
  total_fees: string
  trace_id?: string
  description?: {
    aborted?: boolean
    action?: {
      success?: boolean
    }
  }
  in_msg?: TonTxMessage
  out_msgs?: TonTxMessage[]
}

export type JettonTransferRecord = {
  source?: string
  destination?: string
  amount?: string
  jetton_master?: string
  trace_id?: string
}

export type TonAddressBook = Record<string, { user_friendly: string }>

export type TonApiTxResponse = {
  transactions?: TonTx[]
  address_book?: TonAddressBook
}

export type TonJettonWallet = {
  address: string
  balance: string
  jetton: string
}

export type TonJettonWalletsResponse = {
  jetton_wallets?: TonJettonWallet[]
  address_book?: TonAddressBook
  metadata?: Record<
    string,
    {
      token_info?: {
        name?: string
        symbol?: string
        extra?: {
          decimals?: string
        }
      }[]
    }
  >
}

export type TonJettonTransfersResponse = {
  jetton_transfers?: JettonTransferRecord[]
  address_book?: TonAddressBook
}

export type TonMessage = {
  hash: string
  in_msg_tx_hash?: string
}

export type TonMessagesResponse = {
  messages?: TonMessage[]
}

export type TonRunGetMethodResult = {
  exit_code: number
  stack: [string, string][]
}

export type TonSendBocResult = {
  hash: string
}

export type TonConfigParamResult = {
  gas_price?: string
  flat_gas_limit?: string
  flat_gas_price?: string
}

export type ChainAdapterArgs = {
  rpcUrl: string
}

export type TonRpcResponse<T> = {
  ok: boolean
  result?: T
  error?: string
}

export type TonAccountInfo = {
  balance: string
  state: 'active' | 'uninitialized' | 'frozen'
  code?: string
  data?: string
}

export type TonTrace = {
  trace_id: string
  is_incomplete?: boolean
  transactions?: Record<string, TonTx>
}

export type TonTracesResponse = {
  traces?: TonTrace[]
  address_book?: TonAddressBook
}

export type Account = TonAccount
export type FeeData = TonFeeData
export type GetFeeDataInput = TonGetFeeDataInput
