import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useState } from 'react'
import type { TradeQuoteStep } from 'lib/swapper/types'

export const useMockAllowanceApproval = (
  _tradeQuoteStep: TradeQuoteStep,
  _isFirstHop: boolean,
  _isExactAllowance: boolean,
) => {
  const [approvalTxId, setApprovalTxId] = useState<string>()
  const [approvalTxStatus, setApprovalTxStatus] = useState<TxStatus>(TxStatus.Unknown)
  const executeAllowanceApproval = useCallback(() => {
    setApprovalTxStatus(TxStatus.Pending)
    const promise = new Promise((resolve, _reject) => {
      setTimeout(() => setApprovalTxId('0x12345678901234567890'), 2000)
      setTimeout(() => {
        setApprovalTxStatus(TxStatus.Confirmed)
        resolve(undefined)
      }, 5000)
    })

    return promise
  }, [])

  return {
    wasApprovalNeeded: true, // the original value of isApprovalNeeded, used for initial UI rendering
    isApprovalNeeded: true,
    executeAllowanceApproval,
    approvalTxId,
    approvalTxStatus,
    approvalNetworkFeeCryptoBaseUnit: '12345678901234',
  }
}

export const useMockTradeExecution = () => {
  const [tradeStatus, setTradeStatus] = useState(TxStatus.Unknown)
  const [sellTxHash, setSellTxHash] = useState<string>()
  const executeTrade = useCallback(() => {
    const promise = new Promise((resolve, _reject) => {
      setTradeStatus(TxStatus.Pending)
      setTimeout(() => setSellTxHash('0x12345678901234567890'), 2000)
      setTimeout(() => {
        setTradeStatus(TxStatus.Confirmed)
        resolve(undefined)
      }, 5000)
    })

    return promise
  }, [])

  return {
    buyTxHash: undefined,
    sellTxHash,
    tradeStatus,
    executeTrade,
  }
}
