import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { solana } from '@shapeshiftoss/chain-adapters'
import { CONTRACT_INTERACTION, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsSolana } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'
import bs58 from 'bs58'

import type { SupportedSessionRequest } from '@/plugins/walletConnectToDapps/types'
import { SolanaSigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveSolanaRequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  chainAdapter: solana.ChainAdapter
  accountMetadata?: AccountMetadata
}

export const approveSolanaRequest = async ({
  requestEvent,
  wallet,
  chainAdapter,
  accountMetadata,
}: ApproveSolanaRequestArgs): Promise<JsonRpcResult> => {
  const { params, id } = requestEvent
  const { request } = params

  if (!supportsSolana(wallet)) {
    throw new Error('Wallet does not support Solana')
  }

  const bip44Params = accountMetadata?.bip44Params
  const addressNList = bip44Params ? toAddressNList(chainAdapter.getBip44Params(bip44Params)) : []

  switch (request.method) {
    case SolanaSigningMethod.SOLANA_SIGN_TRANSACTION: {
      if (!wallet.solanaSignRawTransaction) {
        throw new Error('Wallet does not support raw Solana transaction signing')
      }

      const { transaction } = request.params as { transaction: string }
      const result = await wallet.solanaSignRawTransaction({
        addressNList,
        rawTransaction: transaction,
      })
      if (!result) throw new Error('Failed to sign Solana transaction')

      const signature = bs58.encode(Buffer.from(result.signatures[0], 'base64'))
      return formatJsonRpcResult(id, { signature })
    }

    case SolanaSigningMethod.SOLANA_SIGN_AND_SEND_TRANSACTION: {
      if (!wallet.solanaSignRawTransaction) {
        throw new Error('Wallet does not support raw Solana transaction signing')
      }

      const { transaction } = request.params as { transaction: string }
      const result = await wallet.solanaSignRawTransaction({
        addressNList,
        rawTransaction: transaction,
      })
      if (!result) throw new Error('Failed to sign Solana transaction')

      const address = await wallet.solanaGetAddress({ addressNList })
      if (!address) throw new Error('Failed to get Solana address for broadcast')
      const txHash = await chainAdapter.broadcastTransaction({
        senderAddress: address,
        receiverAddress: CONTRACT_INTERACTION,
        hex: result.serialized,
      })

      return formatJsonRpcResult(id, { signature: txHash })
    }

    case SolanaSigningMethod.SOLANA_SIGN_ALL_TRANSACTIONS: {
      const { solanaSignRawTransaction } = wallet
      if (!solanaSignRawTransaction) {
        throw new Error('Wallet does not support raw Solana transaction signing')
      }

      const { transactions } = request.params as { transactions: string[] }
      const signedTxs = await Promise.all(
        transactions.map(async tx => {
          const result = await solanaSignRawTransaction.call(wallet, {
            addressNList,
            rawTransaction: tx,
          })
          if (!result) throw new Error('Failed to sign Solana transaction')
          return result.serialized
        }),
      )

      return formatJsonRpcResult(id, { transactions: signedTxs })
    }

    case SolanaSigningMethod.SOLANA_SIGN_MESSAGE: {
      if (!wallet.solanaSignMessage) {
        throw new Error('Wallet does not support Solana message signing')
      }

      const { message } = request.params as { message: string }
      const messageBytes = bs58.decode(message)
      const result = await wallet.solanaSignMessage({ addressNList, message: messageBytes })
      if (!result) throw new Error('Failed to sign Solana message')

      const signature = bs58.encode(Buffer.from(result.signature, 'base64'))
      return formatJsonRpcResult(id, { signature })
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
