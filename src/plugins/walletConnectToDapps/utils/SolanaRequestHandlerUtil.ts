import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { solana } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'

import { assertIsDefined } from '@/lib/utils'
import type {
  CustomTransactionData,
  SupportedSessionRequest,
} from '@/plugins/walletConnectToDapps/types'
import { SolanaSigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveSolanaRequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  chainAdapter: solana.ChainAdapter
  accountMetadata?: AccountMetadata
  customTransactionData?: CustomTransactionData
  accountId?: AccountId
}

export const approveSolanaRequest = async ({
  requestEvent,
  wallet,
  chainAdapter,
  accountMetadata,
  accountId,
}: ApproveSolanaRequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params, id } = requestEvent
  const { request } = params

  if (!supportsSolana(wallet)) {
    throw new Error('Wallet does not support Solana')
  }

  switch (request.method) {
    case SolanaSigningMethod.SOLANA_SIGN_TRANSACTION: {
      assertIsDefined(accountMetadata)

      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))
      const address = accountId ? fromAccountId(accountId).account : undefined

      const signedTx = await wallet.solanaSignTx({
        addressNList,
        to: '',
        value: '0',
        blockHash: '',
        pubKey: address,
        instructions: [],
      })

      if (!signedTx?.serialized) throw new Error('Failed to sign Solana transaction')

      return formatJsonRpcResult(id, { signature: signedTx.serialized })
    }

    case SolanaSigningMethod.SOLANA_SIGN_AND_SEND_TRANSACTION: {
      assertIsDefined(accountMetadata)

      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))
      const address = accountId ? fromAccountId(accountId).account : undefined

      const signedTx = await wallet.solanaSignTx({
        addressNList,
        to: '',
        value: '0',
        blockHash: '',
        pubKey: address,
        instructions: [],
      })

      if (!signedTx?.serialized) throw new Error('Failed to sign Solana transaction')

      const txHash = await chainAdapter.broadcastTransaction({
        senderAddress: address ?? '',
        receiverAddress: '',
        hex: signedTx.serialized,
      })

      return formatJsonRpcResult(id, { signature: txHash })
    }

    case SolanaSigningMethod.SOLANA_SIGN_MESSAGE: {
      assertIsDefined(accountMetadata)

      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(chainAdapter.getBip44Params(bip44Params))
      const address = accountId ? fromAccountId(accountId).account : undefined

      const signedTx = await wallet.solanaSignTx({
        addressNList,
        to: '',
        value: '0',
        blockHash: '',
        pubKey: address,
        instructions: [],
      })

      if (!signedTx?.signatures?.[0]) throw new Error('Failed to sign Solana message')

      return formatJsonRpcResult(id, { signature: signedTx.signatures[0] })
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
