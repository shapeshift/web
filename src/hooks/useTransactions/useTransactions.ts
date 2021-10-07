import { ChainTypes, Transaction } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { fromBaseUnit } from 'lib/math'
dayjs.extend(relativeTime)

export type FormatTransactionType = Transaction & {
  type: string
  amount: string
  date: string
  dateFromNow: string
  chain: ChainTypes
}

export type UseTransactionsReturnType = {
  loading: boolean | undefined
  txHistory: Record<string, FormatTransactionType[]> | undefined
}

export type UseTransactionsPropType = {
  chain?: ChainTypes | undefined
  contractAddress?: string | undefined
  symbol?: string | undefined
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
  if (!(txs ?? []).length) return []
  return txs.map((tx: Transaction) => {
    const date = getDate(tx.timestamp)
    return {
      ...tx,
      type: walletAddress === tx.from ? TxTypeEnum.Sent : TxTypeEnum.Received,
      amount: fromBaseUnit(tx.value, 18 /** TODO: get precision from asset service **/),
      date,
      dateFromNow: dayjs(date).fromNow(),
      fee: fromBaseUnit(tx.fee, 18),
      chain: tx.chain
    }
  })
}

export const useTransactions = ({
  chain,
  contractAddress = '',
  symbol = ''
}: UseTransactionsPropType = {}): UseTransactionsReturnType => {
  const [loading, setLoading] = useStateIfMounted<boolean | undefined>(false)
  const [txHistory, setTxHistory] = useStateIfMounted<
    Record<string, FormatTransactionType[]> | undefined
  >({})
  const {
    state: { wallet, walletInfo }
  } = useWallet()
  const chainAdapterManager = useChainAdapters()

  const getTxHistory = useCallback(async () => {
    if (!wallet) return
    const supportedAdapters = chainAdapterManager.getSupportedAdapters()
    if (!supportedAdapters.length) return
    // TODO: remove hard coded pagination info after implementing web sockets and/or infinite scrolling
    const page = 1
    const pageSize = 35

    // Get transaction history for chain that is provided.
    if (chain) {
      const chainAdapter = chainAdapterManager.byChain(chain)
      const address = await chainAdapter.getAddress({ wallet, path: "m/44'/60'/0'/0/0" })
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
      const formattedTransactions = formatTransactions(
        txHistoryResponse?.transactions ?? [],
        address
      )
      return { txs: formattedTransactions }
    }

    const acc: Record<string, FormatTransactionType[]> = {}
    const transactions: FormatTransactionType[] = []

    // Get transaction history for all chians that are supported.
    for (const getAdapter of supportedAdapters) {
      const genericAdapter = getAdapter()
      const address = await genericAdapter.getAddress({ wallet, path: "m/44'/60'/0'/0/0" })
      let txHistoryResponse
      try {
        txHistoryResponse = await genericAdapter.getTxHistory(address, {
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
