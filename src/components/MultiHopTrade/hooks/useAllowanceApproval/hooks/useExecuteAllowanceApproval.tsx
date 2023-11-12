import type { evm } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { buildAndBroadcast, isEvmChainAdapter } from 'lib/utils/evm'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import { selectLastHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { APPROVAL_POLL_INTERVAL_MILLISECONDS } from '../../constants'
import { checkApprovalNeeded } from '../helpers'

export const useExecuteAllowanceApproval = (
  tradeQuoteStep: TradeQuoteStep,
  isFirstHop: boolean,
  buildCustomTxInput?: evm.BuildCustomTxInput,
) => {
  const [txId, setTxId] = useState<string | undefined>()
  const [txStatus, setTxStatus] = useState<TxStatus>(TxStatus.Unknown)
  const { poll } = usePoll()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet

  const sellAssetAccountId = useAppSelector(
    isFirstHop ? selectFirstHopSellAccountId : selectLastHopSellAccountId,
  )
  const executeAllowanceApproval = useCallback(async () => {
    setTxStatus(TxStatus.Pending)

    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(tradeQuoteStep.sellAsset.chainId)

    if (!wallet || !supportsETH(wallet)) throw Error('eth wallet required')
    if (!adapter || !isEvmChainAdapter(adapter))
      throw Error(
        `no valid EVM chain adapter found for chain Id: ${tradeQuoteStep.sellAsset.chainId}`,
      )

    if (!buildCustomTxInput) {
      console.error('missing buildCustomTxInput')
      return
    }

    try {
      const txId = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: undefined, // no receiver for this contract call
      })

      setTxId(txId)

      await poll({
        fn: async () => {
          if (!wallet) return
          return await checkApprovalNeeded(tradeQuoteStep, wallet, sellAssetAccountId ?? '')
        },
        validate: (isApprovalNeeded?: boolean) => isApprovalNeeded === false,
        interval: APPROVAL_POLL_INTERVAL_MILLISECONDS,
        maxAttempts: Infinity,
      })

      setTxStatus(TxStatus.Confirmed)
    } catch (e) {
      setTxStatus(TxStatus.Failed)
      showErrorToast(e)
    }
  }, [buildCustomTxInput, poll, sellAssetAccountId, showErrorToast, tradeQuoteStep, wallet])

  return {
    executeAllowanceApproval,
    txId,
    txStatus,
  }
}
