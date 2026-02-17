import type { JsonRpcResult } from '@json-rpc-tools/utils'
import type { AccountId } from '@shapeshiftoss/caip'
import type { solana } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'

import type { SupportedSessionRequest } from '@/plugins/walletConnectToDapps/types'
import { SolanaSigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveSolanaRequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  chainAdapter: solana.ChainAdapter
  accountMetadata?: AccountMetadata
  accountId?: AccountId
}

export const approveSolanaRequest = async ({
  requestEvent,
  wallet,
}: ApproveSolanaRequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params } = requestEvent
  const { request } = params

  if (!supportsSolana(wallet)) {
    throw new Error('Wallet does not support Solana')
  }

  switch (request.method) {
    // WC dApps send pre-built serialized transactions as base64 strings.
    // hdwallet's solanaSignTx only supports building transactions from structured params
    // (to, value, instructions, etc.) via solanaBuildTransaction - it cannot sign pre-built
    // serialized transactions. A solanaSignRawTransaction method is needed in hdwallet-core
    // to support this flow.
    case SolanaSigningMethod.SOLANA_SIGN_TRANSACTION:
      throw new Error(
        'solana_signTransaction is not yet supported: hdwallet cannot sign pre-built serialized transactions',
      )

    case SolanaSigningMethod.SOLANA_SIGN_AND_SEND_TRANSACTION:
      throw new Error(
        'solana_signAndSendTransaction is not yet supported: hdwallet cannot sign pre-built serialized transactions',
      )

    case SolanaSigningMethod.SOLANA_SIGN_ALL_TRANSACTIONS:
      throw new Error(
        'solana_signAllTransactions is not yet supported: hdwallet cannot sign pre-built serialized transactions',
      )

    // hdwallet-core has no solanaSignMessage method - only solanaSignTx which builds
    // and signs transactions, not arbitrary messages
    case SolanaSigningMethod.SOLANA_SIGN_MESSAGE:
      throw new Error(
        'solana_signMessage is not yet supported: hdwallet has no solanaSignMessage method',
      )

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
