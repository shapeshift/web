import { fromAccountId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useEffect, useMemo, useState } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import {
  selectFeeAssetById,
  selectFirstHopSellAccountId,
  selectSecondHopSellAccountId,
} from 'state/slices/selectors'
import {
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { APPROVAL_POLL_INTERVAL_MILLISECONDS } from '../../../hooks/constants'
import { getApprovalTxData } from './helpers'

export const useApprovalTx = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  isExactAllowance: boolean,
) => {
  const [approvalNetworkFeeCryptoBaseUnit, setApprovalNetworkFeeCryptoBaseUnit] = useState<
    string | undefined
  >()
  const [isLoading, setIsLoading] = useState(true)
  const [buildCustomTxInput, setBuildCustomTxInput] = useState<evm.BuildCustomTxInput | undefined>()
  const wallet = useWallet().state.wallet
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const secondHop = useAppSelector(selectSecondHop)
  const { poll, cancelPolling: stopPolling } = usePoll()

  // TODO(gomes): this is temporary while devving - we should use the previous selectHopSellAccountId selector, if arity is happy there,
  // else fix it and still use it because this is ugly
  const firstHopSellAssetAccountId = useAppSelector(state => selectFirstHopSellAccountId(state))

  // the network fee asset for the second hop in the trade
  const secondHopSellFeeAsset = useAppSelector(state =>
    isMultiHopTrade && secondHop
      ? selectFeeAssetById(state, secondHop?.sellAsset.assetId)
      : undefined,
  )

  const secondHopSellAssetAccountId = useAppSelector(state =>
    selectSecondHopSellAccountId(state, {
      chainId: secondHopSellFeeAsset?.chainId,
      accountNumber: secondHop?.accountNumber,
    }),
  )
  const sellAssetAccountId =
    hopIndex === 0 ? firstHopSellAssetAccountId : secondHopSellAssetAccountId

  useEffect(() => {
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
          isExactAllowance,
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
  }, [sellAssetAccountId, isExactAllowance, poll, tradeQuoteStep, wallet])

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
