import type { evm } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuote } from 'lib/swapper/api'
import { isEvmChainAdapter } from 'lib/utils/evm'

import { APPROVAL_POLL_INTERVAL_MILLISECONDS } from '../../constants'
import { getApprovalTxData } from '../helpers'

export const useApprovalTx = (
  tradeQuoteStep: TradeQuote['steps'][number],
  isExactAllowance: boolean,
) => {
  const [approvalNetworkFeeCryptoBaseUnit, setApprovalNetworkFeeCryptoBaseUnit] = useState<
    string | undefined
  >()
  const [buildCustomTxInput, setBuildCustomTxInput] = useState<evm.BuildCustomTxInput | undefined>()
  const wallet = useWallet().state.wallet
  const { poll, cancelPolling: stopPolling } = usePoll()

  useEffect(() => {
    poll({
      fn: async () => {
        const adapterManager = getChainAdapterManager()
        const adapter = adapterManager.get(tradeQuoteStep.sellAsset.chainId)

        if (!wallet || !supportsETH(wallet)) throw Error('eth wallet required')
        if (!adapter || !isEvmChainAdapter(adapter))
          throw Error(
            `no valid EVM chain adapter found for chain Id: ${tradeQuoteStep.sellAsset.chainId}`,
          )

        const { buildCustomTxInput, networkFeeCryptoBaseUnit } = await getApprovalTxData(
          tradeQuoteStep,
          adapter,
          wallet,
          isExactAllowance,
        )

        setApprovalNetworkFeeCryptoBaseUnit(networkFeeCryptoBaseUnit)
        setBuildCustomTxInput(buildCustomTxInput)
      },
      validate: () => false,
      interval: APPROVAL_POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [isExactAllowance, poll, tradeQuoteStep, wallet])

  return {
    approvalNetworkFeeCryptoBaseUnit,
    buildCustomTxInput,
    stopPolling,
  }
}
