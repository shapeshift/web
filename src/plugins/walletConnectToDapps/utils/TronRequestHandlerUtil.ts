import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsTron } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'

import { assertIsDefined } from '@/lib/utils'
import type {
  CustomTransactionData,
  SupportedSessionRequest,
} from '@/plugins/walletConnectToDapps/types'
import { TronSigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveTronRequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  accountMetadata?: AccountMetadata
  customTransactionData?: CustomTransactionData
  accountId?: AccountId
}

export const approveTronRequest = async ({
  requestEvent,
  wallet,
  accountMetadata,
  accountId,
}: ApproveTronRequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params, id } = requestEvent
  const { request } = params

  if (!supportsTron(wallet)) {
    throw new Error('Wallet does not support Tron')
  }

  switch (request.method) {
    case TronSigningMethod.TRON_SIGN_TRANSACTION: {
      assertIsDefined(accountMetadata)

      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)

      const { transaction } = request.params
      const rawDataHex = transaction.raw_data_hex as string

      if (!rawDataHex) {
        throw new Error('Transaction raw_data_hex is required')
      }

      const signedTx = await wallet.tronSignTx({
        addressNList,
        rawDataHex,
      })

      if (!signedTx?.signature) {
        throw new Error('Failed to sign Tron transaction')
      }

      return formatJsonRpcResult(id, { signature: signedTx.signature })
    }

    case TronSigningMethod.TRON_SIGN_MESSAGE: {
      // hdwallet doesn't have a dedicated tronSignMessage method, so we convert the message
      // to hex and pass it as rawDataHex to tronSignTx as a workaround
      assertIsDefined(accountMetadata)
      assertIsDefined(accountId)

      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)
      const { account: address } = fromAccountId(accountId)

      const message = request.params.message as string
      const messageHex = Buffer.from(message, 'utf8').toString('hex')

      const signedTx = await wallet.tronSignTx({
        addressNList,
        rawDataHex: messageHex,
      })

      if (!signedTx?.signature) {
        throw new Error('Failed to sign Tron message')
      }

      return formatJsonRpcResult(id, { signature: signedTx.signature, address })
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
