import { Button, useMediaQuery } from '@chakra-ui/react'
import { TransferType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import fileDownload from 'js-file-download'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { getTransfers, getTxType } from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  selectAssets,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectTxs,
} from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

type ReportRow = {
  txid: TxId
  type: string
  status: string
  timestamp: string
  minerFee: string
  minerFeeCurrency: string
  inputAmount: string
  inputCurrency: string
  inputAddress: string
  outputAmount: string
  outputCurrency: string
  outputAddress: string
}

const jsonToCsv = (fields: Record<string, string>, rows: ReportRow[]): string => {
  const csvRows = [
    Object.values(fields).join(','), // header
    ...rows.map(row => Object.values(row).join(',')), // data
  ].join('\r\n')

  return `${csvRows}\r\n`
}

const buttonMargin = [3, 3, 6]

export const DownloadButton = ({ txIds }: { txIds: TxId[] }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`, { ssr: false })
  const allTxs = useAppSelector(selectTxs)
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
  const translate = useTranslate()
  const fields = useMemo(
    () => ({
      txid: translate('transactionHistory.csv.txid'),
      type: translate('transactionHistory.csv.type'),
      status: translate('transactionHistory.csv.status'),
      timestamp: translate('transactionHistory.csv.timestamp'),
      minerFee: translate('transactionHistory.csv.minerFee'),
      minerFeeCurrency: translate('transactionHistory.csv.minerFeeCurrency'),
      inputAmount: translate('transactionHistory.csv.inputAmount'),
      inputCurrency: translate('transactionHistory.csv.inputCurrency'),
      inputAddress: translate('transactionHistory.csv.inputAddress'),
      outputAmount: translate('transactionHistory.csv.outputAmount'),
      outputCurrency: translate('transactionHistory.csv.outputCurrency'),
      outputAddress: translate('transactionHistory.csv.outputAddress'),
    }),
    [translate],
  )

  const generateCSV = useCallback(() => {
    setIsLoading(true)

    const report: ReportRow[] = []
    for (const txId of txIds) {
      const tx = allTxs[txId]
      const transfers = getTransfers(tx, assets, marketData)
      const type = getTxType(tx, transfers)
      const feeAsset = tx.fee ? assets[tx.fee?.assetId] : undefined

      const { send, receive } = (() => {
        if (transfers.length === 1) return { send: transfers[0], receive: transfers[0] }
        return {
          send: transfers.find(transfer => transfer.type === TransferType.Send),
          receive: transfers.find(transfer => transfer.type === TransferType.Receive),
        }
      })()

      const typeLabel = (() => {
        if (type === 'unknown') return 'transactionRow.unknown'
        if (tx.data?.method) return `transactionRow.parser.${tx.data.parser}.${tx.data.method}`
        return `transactionHistory.transactionTypes.${type}`
      })()

      report.push({
        txid: tx.txid,
        type: translate(typeLabel),
        status: translate(`transactionRow.${tx.status.toLowerCase()}`),
        timestamp: dayjs(tx.blockTime * 1000).toISOString(),
        minerFee:
          tx.fee && feeAsset
            ? bnOrZero(fromBaseUnit(tx.fee.value, feeAsset.precision)).toString()
            : '0',
        minerFeeCurrency: feeAsset?.symbol ?? '-',
        inputAmount: send
          ? bnOrZero(fromBaseUnit(send.value, send.asset?.precision ?? 18)).toString()
          : '-',
        inputCurrency: send?.asset?.symbol ?? send?.assetId ?? '-',
        inputAddress: send?.from ?? '-',
        outputAmount: receive
          ? bnOrZero(fromBaseUnit(receive.value, receive.asset?.precision ?? 18)).toString()
          : '-',
        outputCurrency: receive?.asset?.symbol ?? receive?.assetId ?? '-',
        outputAddress: receive?.to ?? '-',
      })
    }

    try {
      const data = jsonToCsv(fields, report)
      const filename = `${translate('transactionHistory.csv.fileName')} - ${dayjs().format(
        'HH:mm A, MMMM DD, YYYY',
      )}.csv`
      fileDownload(data, filename)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [allTxs, assets, fields, marketData, translate, txIds])

  return isLargerThanLg ? (
    <Button
      ml={buttonMargin}
      colorScheme='blue'
      variant='ghost-filled'
      isLoading={isLoading}
      onClick={generateCSV}
    >
      <Text translation='transactionHistory.downloadCSV' />
    </Button>
  ) : null
}
