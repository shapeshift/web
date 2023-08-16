import type { AccountId } from '@shapeshiftoss/caip'
import { cosmosChainId, fromAccountId, osmosisChainId, toAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { IbcMetadata } from '@shapeshiftoss/unchained-client/src/cosmossdk'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { ReduxState } from 'state/reducer'
import { selectTxById, selectTxsByFilter } from 'state/slices/selectors'

// TODO: leverage chain-adapters websockets
export const pollForComplete = ({
  txid,
  getState,
}: {
  txid: string
  getState: () => ReduxState
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = 300000 // 5 mins
    const startTime = Date.now()
    const interval = 5000 // 5 seconds

    const poll = function () {
      // TODO: this should just be a fetch to unchained
      const tx = selectTxById(getState(), txid)
      if (tx?.status === TxStatus.Confirmed) {
        resolve('success')
      } else if (Date.now() - startTime > timeout) {
        reject(
          new SwapError(`Couldnt find tx ${txid}`, {
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
// TODO(gomes): Now that we're relying on Txhistory Txs, we could make this a usePoll hook, reactive on the TxHistory slice?
export const pollForCrossChainComplete = ({
  initiatingChainTxid,
  initiatingChainAccountId,
  getState,
}: {
  initiatingChainAccountId: AccountId
  initiatingChainTxid: string
  // Injecting this since we can't avoid circular dependencies when calling this from OsmosisSwapper/endpoints
  getState: () => ReduxState
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = 300000 // 5 mins
    const startTime = Date.now()
    const interval = 5000 // 5 seconds

    const poll = function () {
      // TODO: this should just be a fetch to unchained
      const initiatingChainTx = selectTxById(getState(), initiatingChainTxid)
      if (initiatingChainTx && initiatingChainTx.status === TxStatus.Confirmed) {
        // Initiating Tx is successful, now we need to wait for the destination tx to be picked up by validators

        const initiatingChainId = fromAccountId(initiatingChainAccountId).chainId
        const initiatingChainSequence = (initiatingChainTx.data as IbcMetadata | undefined)
          ?.sequence
        const destinationChainAddress = (initiatingChainTx.data as IbcMetadata | undefined)
          ?.ibcDestination

        // None of these two should ever happen but it may - a confirmed MsgTransfer Tx contains an initiating sequence and a destination address
        // if we don't parse them, we have bigger problems at unchained-client level
        if (!initiatingChainSequence) throw new Error('sequence not found in initiating Tx')
        if (!destinationChainAddress) throw new Error('ibcDestination not found in initiating Tx')

        const destinationChainId =
          initiatingChainId === cosmosChainId ? osmosisChainId : cosmosChainId
        const destinationChainAccountId = toAccountId({
          chainId: destinationChainId,
          account: destinationChainAddress,
        })

        const destinationAccountTxs = selectTxsByFilter(getState(), {
          accountId: destinationChainAccountId,
        })
        const maybeFoundTx = destinationAccountTxs.some(
          tx => (tx.data as IbcMetadata | undefined)?.sequence === initiatingChainSequence,
        )

        if (maybeFoundTx) return resolve('success')
        else {
          setTimeout(poll, interval)
          return
        }
      } else if (Date.now() - startTime > timeout) {
        reject(
          new SwapError(`Couldnt find tx ${initiatingChainTxid}`, {
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
