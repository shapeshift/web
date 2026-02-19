import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { Cosmos, CosmosSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsCosmos } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys'
import { AuthInfo } from 'cosmjs-types/cosmos/tx/v1beta1/tx'

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

const extractPubKeyFromAuthInfoBytes = (authInfoBytesBase64: string): string => {
  const authInfoBytes = Buffer.from(authInfoBytesBase64, 'base64')
  const authInfo = AuthInfo.decode(new Uint8Array(authInfoBytes))
  const signerInfo = authInfo.signerInfos[0]
  if (!signerInfo?.publicKey) throw new Error('No public key found in signed transaction')
  const pubKey = PubKey.decode(signerInfo.publicKey.value)
  return Buffer.from(pubKey.key).toString('base64')
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
      const { accountNumber } = bip44Params
      const chainAdapter = assertGetCosmosSdkChainAdapter(params.chainId)
      const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))

      const { signDoc } = request.params as CosmosSignAminoCallRequestParams

      const txToSign: CosmosSignTx = {
        addressNList,
        tx: {
          msg: signDoc.msgs as unknown as Cosmos.Msg[],
          fee: signDoc.fee as unknown as Cosmos.StdFee,
          signatures: [],
          memo: signDoc.memo,
        },
        chain_id: signDoc.chain_id,
        account_number: accountNumber.toString(),
        sequence: signDoc.sequence,
      }

      const signedTx = await wallet.cosmosSignTx(txToSign)
      if (!signedTx) throw new Error('Failed to sign Cosmos transaction')

      const pubKeyBase64 = extractPubKeyFromAuthInfoBytes(signedTx.authInfoBytes)

      return formatJsonRpcResult(id, {
        signed: signDoc,
        signature: {
          pub_key: {
            type: 'tendermint/PubKeySecp256k1',
            value: pubKeyBase64,
          },
          signature: signedTx.signatures[0],
        },
      })
    }

    case CosmosSigningMethod.COSMOS_SIGN_DIRECT: {
      throw new Error('cosmos_signDirect is not yet supported - use cosmos_signAmino instead')
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
