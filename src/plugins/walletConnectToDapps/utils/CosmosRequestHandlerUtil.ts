import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { Cosmos, CosmosSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsCosmos } from '@shapeshiftoss/hdwallet-core'
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
  accountId,
}: ApproveCosmosRequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params, id } = requestEvent
  const { request } = params

  switch (request.method) {
    case CosmosSigningMethod.COSMOS_GET_ACCOUNTS: {
      assertIsDefined(accountMetadata)
      assertIsDefined(accountId)

      if (!supportsCosmos(wallet)) {
        throw new Error('Wallet does not support Cosmos')
      }

      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))
      const address = fromAccountId(accountId).account

      const pubKeyBytes = await (async () => {
        try {
          const addr = await wallet.cosmosGetAddress({ addressNList })
          if (addr) return addr
        } catch {}
        return null
      })()

      // Best-effort: pubkey should be a base64-encoded secp256k1 public key, but not all
      // wallets expose it. Falls back to bech32 address which is semantically wrong but
      // allows dApps that don't strictly validate the pubkey field to still work.
      return formatJsonRpcResult(id, [
        {
          address,
          algo: 'secp256k1',
          pubkey: pubKeyBytes ?? address,
        },
      ])
    }

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
