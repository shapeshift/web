import { ChainAdapter, Transaction } from '@shapeshiftoss/chain-adapters'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { fromBaseUnit } from 'lib/math'
import { useCallback, useEffect, useState } from 'react'
dayjs.extend(relativeTime)

export type FormatTransactionType = Transaction & {
  type: string
  amount: string
  date: string
  dateFromNow: string
}

export type UseTransactionsReturnType = {
  loading: boolean
  txHistory: Record<string, FormatTransactionType[]>
}

export enum TxTypeEnum {
  Sent = 'Sent',
  Received = 'Received'
}

export enum TxStatusEnum {
  Confirmed = 'confirmed',
  Failed = 'failed'
}

export const getDate = (timestamp: number) =>
  dayjs(Number(timestamp) * 1000).format('MM/DD/YYYY h:mm A')

const formatTransactions = (txs: Transaction[], walletAddress: string): FormatTransactionType[] => {
  return txs.map((tx: Transaction) => {
    const date = getDate(tx.timestamp)
    return {
      ...tx,
      type: walletAddress === tx.from ? TxTypeEnum.Sent : TxTypeEnum.Received,
      amount: fromBaseUnit(tx.value, 18 /** TODO: get precision from asset service **/),
      date,
      dateFromNow: dayjs(date).fromNow(),
      fee: fromBaseUnit(tx.fee, 18)
    }
  })
}

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
    state: { wallet, walletInfo }
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
      let txHistoryResponse
      try {
        txHistoryResponse = await chainAdapter.getTxHistory(address, {
          page,
          pageSize,
          contract: contractAddress
        })
      } catch (err) {
        console.error(err)
      }
      if (!symbol || !txHistoryResponse) return
      const txHistoryBySymbol = txHistoryResponse.transactions.filter(
        (tx: Transaction) => tx.symbol === symbol
      )
      const formattedTransactions = formatTransactions(txHistoryBySymbol, address)
      return { txs: formattedTransactions }
    }

    const acc: Record<string, FormatTransactionType[]> = {}
    const transactions: FormatTransactionType[] = []

    // Get transaction history for all chians that are supported.
    for (const getAdapter of supportedAdapters) {
      const adapter = getAdapter()
      const address = await adapter.getAddress({ wallet, path: "m/44'/60'/0'/0/0" })
      let txHistoryResponse
      try {
        txHistoryResponse = await adapter.getTxHistory(address, {
          page,
          pageSize,
          contract: contractAddress
        })
      } catch (err) {
        console.error(err)
      }
      if (!txHistoryResponse) continue
      formatTransactions(txHistoryResponse.transactions, address).forEach(
        (tx: FormatTransactionType) => transactions.push(tx)
      )
    }
    acc['txs'] = transactions
    return acc
    // TODO: remove below linter disable comment when we consolidate the 'walletInfo' and 'wallet' in state, we will
    // then be able to check for deviceId on the wallet object rather than checking on the walletInfo object. Until
    // that time, this should not be a problem because 'wallet' and 'walletInfo' are set in state at the same time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, chain, contractAddress, symbol])

  useEffect(() => {
    if (wallet) {
      setLoading(true)
      getTxHistory()
        .then((txHistoryResponse: Record<string, FormatTransactionType[]> | undefined) => {
          txHistoryResponse && setTxHistory(txHistoryResponse)
        })
        .finally(() => setLoading(false))
    }
    // TODO: Same as above dependency list for 'getTxHistory' function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, getTxHistory])

  return {
    loading,
    txHistory
  }
}
