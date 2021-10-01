import { EthereumChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes, Transaction } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { fromBaseUnit } from 'lib/math'
dayjs.extend(relativeTime)

export type FormatTransactionType<T extends ChainTypes> = Transaction<T> & {
  type: string
  amount: string
  date: string
  dateFromNow: string
  chain: T
}

export type UseTransactionsReturnType<T extends ChainTypes> = {
  loading: boolean | undefined
  txHistory: Record<string, FormatTransactionType<T>[]> | undefined
}

export type UseTransactionsPropType = {
  chain?: string | undefined
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

const formatTransactions = <T extends ChainTypes>(
  txs: Transaction<T>[],
  walletAddress: string,
  chain: T
): FormatTransactionType<T>[] => {
  if (!(txs ?? []).length) return []
  return txs.map((tx: Transaction<T>) => {
    const date = getDate(tx.timestamp)
    return {
      ...tx,
      type: walletAddress === tx.from ? TxTypeEnum.Sent : TxTypeEnum.Received,
      amount: fromBaseUnit(tx.value, 18 /** TODO: get precision from asset service **/),
      date,
      dateFromNow: dayjs(date).fromNow(),
      fee: fromBaseUnit(tx.fee, 18),
      chain
    }
  })
}

export const useTransactions = ({
  chain = '',
  contractAddress = '',
  symbol = ''
}: UseTransactionsPropType = {}): UseTransactionsReturnType<ChainTypes> => {
  const [loading, setLoading] = useStateIfMounted<boolean | undefined>(false)
  const [txHistory, setTxHistory] = useStateIfMounted<
    Record<string, FormatTransactionType<ChainTypes>[]> | undefined
  >({})
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
      const adapterFactory = supportedAdapters.filter(adap => adap().getType() === chain)[0]
      if (!adapterFactory) {
        throw new Error(`useTransactions no adapter available for ${chain} chain`)
      }
      const genericChainAdapter = adapterFactory()
      const adapterType = genericChainAdapter.getType()

      switch (adapterType) {
        case ChainTypes.Ethereum: {
          const chainAdapter = genericChainAdapter as EthereumChainAdapter
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
            address,
            ChainTypes.Ethereum
          )
          return { txs: formattedTransactions }
        }
        default: {
          throw new Error(`useTransactions unsupported adapter type ${adapterType}`)
        }
      }
    }

    const acc: Record<string, FormatTransactionType<ChainTypes>[]> = {}
    const transactions: FormatTransactionType<ChainTypes>[] = []

    // Get transaction history for all chians that are supported.
    for (const getAdapter of supportedAdapters) {
      const genericAdapter = getAdapter()
      const adapterType = genericAdapter.getType()
      switch (adapterType) {
        case ChainTypes.Ethereum: {
          const adapter = genericAdapter as EthereumChainAdapter
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
          formatTransactions(txHistoryResponse.transactions, address, ChainTypes.Ethereum).forEach(
            (tx: FormatTransactionType<ChainTypes.Ethereum>) => transactions.push(tx)
          )
          break
        }
        default: {
          throw new Error(``)
        }
      }
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
        .then(
          (txHistoryResponse: Record<string, FormatTransactionType<ChainTypes>[]> | undefined) => {
            txHistoryResponse && setTxHistory(txHistoryResponse)
          }
        )
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
