import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { fromBaseUnit } from 'lib/math'
dayjs.extend(relativeTime)

export type FormatTransactionType = chainAdapters.Transaction<ChainTypes> & {
  type: string
  amount: string
  date?: string
  dateFromNow?: string
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

const formatTransactions = (
  txs: chainAdapters.Transaction<ChainTypes>[],
  walletAddress: string
): FormatTransactionType[] => {
  if (!(txs ?? []).length) return []
  return txs.map((tx: chainAdapters.Transaction<ChainTypes>) => {
    const timestamp = tx.timestamp
    let date, dateFromNow
    if (timestamp) {
      date = getDate(timestamp)
      dateFromNow = dayjs(date).fromNow()
    }
    const dates = { date, dateFromNow }
    return {
      ...tx,
      ...dates,
      type: walletAddress === tx.from ? TxTypeEnum.Sent : TxTypeEnum.Received,
      amount: fromBaseUnit(tx.value, 18 /** TODO: get precision from asset service **/),
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
      const pubkey = await chainAdapter.getAddress({ wallet })
      let txHistoryResponse
      try {
        txHistoryResponse = await chainAdapter.getTxHistory({
          pubkey,
          page,
          pageSize,
          contract: contractAddress
        })
      } catch (err) {
        console.error(err)
      }
      const formattedTransactions = formatTransactions(
        txHistoryResponse?.transactions ?? [],
        pubkey
      )
      return { txs: formattedTransactions }
    }

    const acc: Record<string, FormatTransactionType[]> = {}
    const transactions: FormatTransactionType[] = []

    // Get transaction history for all chians that are supported.
    for (const getAdapter of supportedAdapters) {
      const genericAdapter = getAdapter()
      const pubkey = await genericAdapter.getAddress({ wallet })
      let txHistoryResponse
      try {
        txHistoryResponse = await genericAdapter.getTxHistory({
          pubkey,
          page,
          pageSize,
          contract: contractAddress
        })
      } catch (err) {
        console.error(err)
      }
      if (!txHistoryResponse) continue
      formatTransactions(txHistoryResponse.transactions, pubkey).forEach(
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
