import type { evm } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuote } from 'lib/swapper/api'
import { buildAndBroadcast } from 'lib/swapper/swappers/utils/helpers/helpers'
import { isEvmChainAdapter } from 'lib/utils'

import { APPROVAL_CHECK_INTERVAL_MILLISECONDS } from '../../constants'
import { checkApprovalNeeded } from '../../helpers'

export const useExecuteAllowanceApproval = (
  tradeQuoteStep: TradeQuote['steps'][number],
  buildCustomTxArgs?: evm.BuildCustomTxInput,
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

    if (!buildCustomTxArgs) {
      console.error('missing buildCustomTxArgs')
      return
    }

    try {
      const txId = await buildAndBroadcast({ wallet, buildCustomTxArgs, adapter })

      setTxId(txId)

      await poll({
        fn: async () => {
          if (!wallet) return
          return await checkApprovalNeeded(tradeQuoteStep, wallet)
        },
        validate: (isApprovalNeeded?: boolean) => isApprovalNeeded === false,
        interval: APPROVAL_CHECK_INTERVAL_MILLISECONDS,
        maxAttempts: Infinity,
      })
    } catch (e) {
      showErrorToast(e)
    }
  }, [buildCustomTxArgs, poll, showErrorToast, tradeQuoteStep, wallet])

  return {
    executeAllowanceApproval,
    txId,
  }
}
