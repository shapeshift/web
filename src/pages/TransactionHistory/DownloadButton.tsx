import { Button, useMediaQuery } from '@chakra-ui/react'
import { TransferType } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import fileDownload from 'js-file-download'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { getTxType } from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectTxs } from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

const moduleLogger = logger.child({ namespace: ['DownloadButton'] })

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

export const DownloadButton = ({ txIds }: { txIds: TxId[] }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`, { ssr: false })
  const allTxs = useAppSelector(selectTxs)
  const assets = useAppSelector(selectAssets)
  const translate = useTranslate()
  const fields = {
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
  }

  const generateCSV = () => {
    setIsLoading(true)

    const report: ReportRow[] = []
    for (const txId of txIds) {
      const tx = allTxs[txId]

      const transfers = tx.transfers.map(t => ({
        ...t,
        asset: assets[t.assetId],
        marketData: defaultMarketData,
      }))

      const type = getTxType(tx, transfers)
      const send =
        transfers.length === 1
          ? transfers[0]
          : transfers.find(transfer => transfer.type === TransferType.Send)
      const receive =
        transfers.length === 1
          ? transfers[0]
          : transfers.find(transfer => transfer.type === TransferType.Receive)
      const feeAsset = tx.fee ? assets[tx.fee?.assetId] : undefined

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
      moduleLogger.error(error, 'DownloadButton:generateCSV error')
    } finally {
      setIsLoading(false)
    }
  }

  return isLargerThanLg ? (
    <Button
      ml={[3, 3, 6]}
      colorScheme='blue'
      variant='ghost-filled'
      isLoading={isLoading}
      onClick={generateCSV}
    >
      <Text translation='transactionHistory.downloadCSV' />
    </Button>
  ) : null
}
