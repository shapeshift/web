import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { Cosmos, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsCosmos } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'

import { assertIsDefined } from '@/lib/utils'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import type {
  CosmosSignAminoCallRequestParams,
  SupportedSessionRequest,
} from '@/plugins/walletConnectToDapps/types'
import { CosmosSigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveCosmosRequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  accountMetadata?: AccountMetadata
}

export const approveCosmosRequest = async ({
  requestEvent,
  wallet,
  accountMetadata,
}: ApproveCosmosRequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params, id } = requestEvent
  const { request } = params

  if (!supportsCosmos(wallet)) {
    throw new Error('Wallet does not support Cosmos')
  }

  switch (request.method) {
    case CosmosSigningMethod.COSMOS_SIGN_AMINO: {
      assertIsDefined(accountMetadata)

      const { bip44Params } = accountMetadata
      const chainAdapter = assertGetCosmosSdkChainAdapter(params.chainId)
      const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))

      const { signDoc } = request.params as CosmosSignAminoCallRequestParams

      if (!wallet.cosmosSignAmino) {
        throw new Error('Wallet does not support cosmosSignAmino')
      }

      const result = await wallet.cosmosSignAmino({
        addressNList,
        signDoc: {
          chain_id: signDoc.chain_id,
          account_number: signDoc.account_number,
          sequence: signDoc.sequence,
          fee: signDoc.fee as unknown as Cosmos.StdFee,
          msgs: signDoc.msgs as unknown as Cosmos.Msg[],
          memo: signDoc.memo,
        },
      })

      if (!result) throw new Error('Failed to sign Cosmos amino transaction')

      return formatJsonRpcResult(id, result)
    }

    case CosmosSigningMethod.COSMOS_SIGN_DIRECT: {
      throw new Error('cosmos_signDirect is not yet supported - use cosmos_signAmino instead')
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
