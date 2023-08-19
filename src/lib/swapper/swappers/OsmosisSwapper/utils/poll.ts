import type { AccountId } from '@shapeshiftoss/caip'
import { cosmosChainId, fromAccountId, osmosisChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { IbcMetadata } from '@shapeshiftoss/unchained-client/src/cosmossdk'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { deserializeTxIndex } from 'state/slices/txHistorySlice/utils'

import type { OsmosisSupportedChainId } from './types'

export const pollForComplete = ({ txid }: { txid: string }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = 300000 // 5 mins
    const startTime = Date.now()
    const interval = 5000 // 5 seconds

    const poll = async function () {
      const { accountId, txid: txHash } = deserializeTxIndex(txid)
      const { account: pubkey } = fromAccountId(accountId)
      const { chainId } = fromAccountId(accountId)
      const chainAdapter = getChainAdapterManager().get(
        chainId,
      ) as ChainAdapter<OsmosisSupportedChainId>
      const txHistory = await chainAdapter.getTxHistory({ pubkey })

      const tx = txHistory.transactions.find(tx => tx.txid === txHash)

      if (tx?.status === TxStatus.Confirmed) {
        resolve('success')
      } else if (Date.now() - startTime > timeout) {
        reject(
          new SwapError(`Couldn't find tx ${txid}`, {
            code: SwapErrorType.RESPONSE_ERROR,
          }),
        )
      } else {
        setTimeout(poll, interval)
      }
    }

    poll()
  })
}

// More logic here, since an IBC transfer consists of 2 transactions
// 1. MsgTransfer on the initiating chain i.e send from source chain to destination chain
// 2. MsgRecvPacket on the receiving chain i.e receive on destination chain from source chain
// While 1. can simply be polled for (which we do on the method above),
// the destination Tx needs to be picked by validators on the destination chain, and we don't know anything about said Tx in advance

export const pollForCrossChainComplete = ({
  initiatingChainTxid,
  initiatingChainAccountId,
}: {
  initiatingChainAccountId: AccountId
  initiatingChainTxid: string
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = 300000 // 5 mins
    const startTime = Date.now()
    const interval = 5000 // 5 seconds

    const poll = async function () {
      const { accountId: initiatingAccountId, txid: initiatingTxid } =
        deserializeTxIndex(initiatingChainTxid)
      const { account: pubkey } = fromAccountId(initiatingAccountId)
      const { chainId: initiatingChainId } = fromAccountId(initiatingAccountId)
      const initiatingChainAdapter = getChainAdapterManager().get(
        initiatingChainId,
      ) as ChainAdapter<OsmosisSupportedChainId>
      const initiatingChainTxHistory = await initiatingChainAdapter.getTxHistory({ pubkey })
      const initiatingChainTx = initiatingChainTxHistory.transactions.find(
        tx => tx.txid === initiatingTxid,
      )

      if (initiatingChainTx && initiatingChainTx.status === TxStatus.Confirmed) {
        const initiatingChainId = fromAccountId(initiatingChainAccountId).chainId
        const initiatingChainSequence = (initiatingChainTx.data as IbcMetadata | undefined)
          ?.sequence
        const destinationChainAddress = (initiatingChainTx.data as IbcMetadata | undefined)
          ?.ibcDestination

        if (!initiatingChainSequence) throw new Error('sequence not found in initiating Tx')
        if (!destinationChainAddress) throw new Error('ibcDestination not found in initiating Tx')

        const destinationChainId =
          initiatingChainId === cosmosChainId ? osmosisChainId : cosmosChainId

        const destinationChainAdapter = getChainAdapterManager().get(
          destinationChainId,
        ) as ChainAdapter<OsmosisSupportedChainId>
        const destinationChainTxHistory = await destinationChainAdapter.getTxHistory({
          pubkey: destinationChainAddress,
        })

        const maybeFoundTx = destinationChainTxHistory.transactions.some(
          tx => (tx.data as IbcMetadata | undefined)?.sequence === initiatingChainSequence,
        )

        if (maybeFoundTx) return resolve('success')
        else {
          setTimeout(poll, interval)
          return
        }
      } else if (Date.now() - startTime > timeout) {
        reject(
          new SwapError(`Couldn't find tx ${initiatingChainTxid}`, {
            code: SwapErrorType.RESPONSE_ERROR,
          }),
        )
      } else {
        setTimeout(poll, interval)
      }
    }

    poll()
  })
}
