import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { AccountId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { Cosmos, CosmosSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata, CosmosSdkChainId } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'

import { assertIsDefined } from '@/lib/utils'
import type {
  CustomTransactionData,
  SupportedSessionRequest,
} from '@/plugins/walletConnectToDapps/types'
import { CosmosSigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveCosmosRequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  chainAdapter: ChainAdapter<CosmosSdkChainId>
  accountMetadata?: AccountMetadata
  customTransactionData?: CustomTransactionData
  accountId?: AccountId
}

export const approveCosmosRequest = async ({
  requestEvent,
  wallet,
  chainAdapter,
  accountMetadata,
  customTransactionData,
}: ApproveCosmosRequestArgs): Promise<JsonRpcResult<string>> => {
  const { params, id } = requestEvent
  const { request } = params

  assertIsDefined(customTransactionData)
  assertIsDefined(accountMetadata)

  const { bip44Params } = accountMetadata
  const { accountNumber } = bip44Params
  const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))

  switch (request.method) {
    case CosmosSigningMethod.COSMOS_SIGN_AMINO:
      // TODO: Implement
      const txToSign: CosmosSignTx = {
        addressNList,
        tx: {
          // FIXME: proto-tx-builder requires a message length of 1, but sign messages have 0
          msg: request.params.signDoc.msgs as unknown as Cosmos.Msg[],
          fee: request.params.signDoc.fee,
          signatures: [],
          memo: request.params.signDoc.memo,
        },
        chain_id: request.params.signDoc.chain_id,
        account_number: accountNumber.toString(),
        sequence: request.params.signDoc.sequence,
        fee: 0, // fixme
      }
      const signedMessage = await chainAdapter.signTransaction({
        txToSign,
        wallet,
      })
      return formatJsonRpcResult(id, signedMessage)

    case CosmosSigningMethod.COSMOS_SIGN_DIRECT: {
      // TODO: Implement
      return formatJsonRpcResult(1, 'signedMessage')
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
