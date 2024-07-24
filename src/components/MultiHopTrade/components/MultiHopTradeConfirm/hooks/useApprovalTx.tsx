import { fromAccountId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { selectHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { APPROVAL_POLL_INTERVAL_MILLISECONDS } from '../../../hooks/constants'
import type { AllowanceType } from './helpers'
import { getApprovalTxData } from './helpers'

export const useApprovalTx = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  allowanceType: AllowanceType,
) => {
  const [approvalNetworkFeeCryptoBaseUnit, setApprovalNetworkFeeCryptoBaseUnit] = useState<
    string | undefined
  >()
  const [isLoading, setIsLoading] = useState(true)
  const [buildCustomTxInput, setBuildCustomTxInput] = useState<evm.BuildCustomTxInput | undefined>()
  const wallet = useWallet().state.wallet
  const { poll, cancelPolling: stopPolling } = usePoll()

  const sellAssetAccountId = useAppSelector(state => selectHopSellAccountId(state, hopIndex))

  useEffect(() => {
    setIsLoading(true)

    poll({
      fn: async () => {
        const adapter = assertGetEvmChainAdapter(tradeQuoteStep.sellAsset.chainId)

        if (!wallet || !supportsETH(wallet)) throw Error('eth wallet required')
        if (!sellAssetAccountId) throw Error('sellAssetAccountId required')

        // This accidentally works since all EVM chains share the same address, so there's no need
        // to call adapter.getAddress() later down the call stack
        const from = fromAccountId(sellAssetAccountId).account
        const supportsEIP1559 = await wallet.ethSupportsEIP1559()

        const { buildCustomTxInput, networkFeeCryptoBaseUnit } = await getApprovalTxData({
          tradeQuoteStep,
          adapter,
          wallet,
          allowanceType,
          from,
          supportsEIP1559,
        })

        setApprovalNetworkFeeCryptoBaseUnit(networkFeeCryptoBaseUnit)
        setBuildCustomTxInput(buildCustomTxInput)
        setIsLoading(false)
      },
      validate: () => false,
      interval: APPROVAL_POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [sellAssetAccountId, allowanceType, poll, tradeQuoteStep, wallet])

  const result = useMemo(
    () => ({
      approvalNetworkFeeCryptoBaseUnit,
      buildCustomTxInput,
      stopPolling,
      isLoading,
    }),
    [approvalNetworkFeeCryptoBaseUnit, buildCustomTxInput, isLoading, stopPolling],
  )

  return result
}
