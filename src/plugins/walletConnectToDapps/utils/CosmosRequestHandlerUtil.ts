import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
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
}

export const approveCosmosRequest = async ({
  requestEvent,
  wallet,
  chainAdapter,
  accountMetadata,
}: ApproveCosmosRequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params, id } = requestEvent
  const { request } = params

  switch (request.method) {
    case CosmosSigningMethod.COSMOS_SIGN_AMINO: {
      assertIsDefined(accountMetadata)

      const { bip44Params } = accountMetadata
      const { accountNumber } = bip44Params
      const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))

      const txToSign: CosmosSignTx = {
        addressNList,
        tx: {
          msg: request.params.signDoc.msgs as unknown as Cosmos.Msg[],
          fee: request.params.signDoc.fee as unknown as Cosmos.StdFee,
          signatures: [],
          memo: request.params.signDoc.memo,
        },
        chain_id: request.params.signDoc.chain_id,
        account_number: accountNumber.toString(),
        sequence: request.params.signDoc.sequence,
      }

      const signedTx = await chainAdapter.signTransaction({
        txToSign,
        wallet,
      })

      return formatJsonRpcResult(id, signedTx)
    }

    case CosmosSigningMethod.COSMOS_SIGN_DIRECT: {
      throw new Error('cosmos_signDirect is not yet supported - use cosmos_signAmino instead')
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
