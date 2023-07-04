import type { evm } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuote } from 'lib/swapper/api'
import { buildAndBroadcast, isEvmChainAdapter } from 'lib/utils/evm'

import { APPROVAL_POLL_INTERVAL_MILLISECONDS } from '../../constants'
import { checkApprovalNeeded } from '../helpers'

export const useExecuteAllowanceApproval = (
  tradeQuoteStep: TradeQuote['steps'][number],
  buildCustomTxInput?: evm.BuildCustomTxInput,
) => {
  const [txId, setTxId] = useState<string | undefined>()
  const { poll } = usePoll()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet

  const executeAllowanceApproval = useCallback(async () => {
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
      const txId = await buildAndBroadcast({ buildCustomTxInput, adapter })

      setTxId(txId)

      await poll({
        fn: async () => {
          if (!wallet) return
          return await checkApprovalNeeded(tradeQuoteStep, wallet)
        },
        validate: (isApprovalNeeded?: boolean) => isApprovalNeeded === false,
        interval: APPROVAL_POLL_INTERVAL_MILLISECONDS,
        maxAttempts: Infinity,
      })
    } catch (e) {
      showErrorToast(e)
    }
  }, [buildCustomTxInput, poll, showErrorToast, tradeQuoteStep, wallet])

  return {
    executeAllowanceApproval,
    txId,
  }
}
