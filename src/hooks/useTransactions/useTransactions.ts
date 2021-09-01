import { ChainAdapter, Transaction, TxHistoryResponse } from '@shapeshiftoss/chain-adapters'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import dayjs from 'dayjs'
import { fromBaseUnit } from 'lib/math'
import { useCallback, useEffect, useState } from 'react'

export type FormatTransactionType = {
  type: string
  symbol: string
  amount: string
  date: string
}

type UseTransactionsReturnType = {
  loading: boolean
  txHistory: Record<string, FormatTransactionType[]>
}

export enum TransactionStatusEnum {
  Sent = 'Sent',
  Received = 'Received'
}

const formatTransactions = (txs: Transaction[], walletAddress: string): FormatTransactionType[] => {
  return txs.map((tx: Transaction) => {
    return {
      type: walletAddress === tx.from ? TransactionStatusEnum.Sent : TransactionStatusEnum.Received,
      symbol: tx.symbol,
      amount: fromBaseUnit(tx.value, 18 /** TODO: get precision from asset service **/),
      date: dayjs(Number(tx.timestamp) * 1000).format('MM/DD/YYYY')
    }
  })
}

// TODO: bring in chain type instead of string
export const useTransactions = ({
  chain,
  contractAddress,
  symbol
}: {
  chain: string | undefined
  contractAddress: string | undefined
  symbol: string | undefined
}): UseTransactionsReturnType => {
  const [loading, setLoading] = useState<boolean>(false)
  const [txHistory, setTxHistory] = useState<Record<string, FormatTransactionType[]>>({})
  const {
    state: { wallet }
  } = useWallet()
  const chainAdapterManager = useChainAdapters()

  const getTxHistory = useCallback(async () => {
    if (!wallet) return
    const supportedAdapters = chainAdapterManager.getSupportedAdapters()
    // TODO: remove hard coded pagination info after implementing web sockets and/or infinite scrolling
    const page = 1
    const pageSize = 35

    // Get transaction history for chain that is provided.
    if (chain) {
      if (!supportedAdapters.length) return
      const getAdapter = supportedAdapters.find(
        (adapter: () => ChainAdapter) => adapter().getType() === chain
      )
      if (!getAdapter) return
      const chainAdapter = getAdapter()
      const address = await chainAdapter.getAddress({ wallet, path: "m/44'/60'/0'/0/0" })
      if (!chainAdapter) return
      const txHistoryResponse: TxHistoryResponse = await chainAdapter.getTxHistory(address, {
        page,
        pageSize,
        contract: contractAddress
      })
      if (!symbol) return
      const txHistoryBySymbol = txHistoryResponse.transactions.filter(
        (tx: Transaction) => tx.symbol === symbol
      )
      return { txs: formatTransactions(txHistoryBySymbol, address) }
    }

    const acc: Record<string, FormatTransactionType[]> = {}
    const transactions: FormatTransactionType[] = []

    // Get transaction history for all chians that are supported.
    for (const getAdapter of supportedAdapters) {
      const adapter = getAdapter()
      const address = await adapter.getAddress({ wallet, path: "m/44'/60'/0'/0/0" })
      const txHistoryResponse: TxHistoryResponse | undefined = await adapter.getTxHistory(address, {
        page,
        pageSize,
        contract: contractAddress
      })
      if (!txHistoryResponse) continue
      formatTransactions(txHistoryResponse.transactions, address).forEach(
        (tx: FormatTransactionType) => transactions.push(tx)
      )
    }
    acc['txs'] = transactions
    return acc
  }, [wallet, chainAdapterManager, chain, contractAddress, symbol])

  useEffect(() => {
    if (wallet) {
      setLoading(true)
      getTxHistory()
        .then((txHistoryResponse: Record<string, FormatTransactionType[]> | undefined) => {
          txHistoryResponse && setTxHistory(txHistoryResponse)
        })
        .finally(() => setLoading(false))
    }
  }, [wallet, getTxHistory])

  return {
    loading,
    txHistory
  }
}
