import { Button, IconButton, useMediaQuery } from '@chakra-ui/react'
import dayjs from 'dayjs'
import fileDownload from 'js-file-download'
import { useCallback, useState } from 'react'
import { TbDownload } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import type { ReportLeg } from './utils'
import { getReportLegs, toAmount, toCsvCell, toReportDate } from './utils'

import { Text } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { getTransfers, getTxType } from '@/hooks/useTxDetails/useTxDetails'
import { selectAssets, selectTxs } from '@/state/slices/selectors'
import type { TxId } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type ReportRow = {
  txid: TxId
  type: string
  status: string
  date: string
  feeAmount: string
  feeCurrency: string
} & ReportLeg

// Fixed English headers so tax tools can match the columns regardless of the app locale
const headers: Record<keyof ReportRow, string> = {
  txid: 'TxHash',
  type: 'Type',
  status: 'Status',
  date: 'Date',
  feeAmount: 'Fee Amount',
  feeCurrency: 'Fee Currency',
  sentAmount: 'Sent Amount',
  sentCurrency: 'Sent Currency',
  sentAddresses: 'Sent Address',
  receivedAmount: 'Received Amount',
  receivedCurrency: 'Received Currency',
  receivedAddresses: 'Received Address',
}

const toCsv = (rows: ReportRow[]): string => {
  const keys = Object.keys(headers) as (keyof ReportRow)[]
  const csvRows = [
    keys.map(key => toCsvCell(headers[key])).join(','),
    ...rows.map(row => keys.map(key => toCsvCell(row[key])).join(',')),
  ].join('\r\n')

  return `${csvRows}\r\n`
}

const noFee = { feeAmount: '', feeCurrency: '' }
const buttonMargin = [3, 3, 6]
const downloadIcon = <TbDownload size='1em' />

export const DownloadButton = ({
  txIds,
  isCompact = false,
}: {
  txIds: TxId[]
  isCompact?: boolean
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)
  const allTxs = useAppSelector(selectTxs)
  const assets = useAppSelector(selectAssets)
  const translate = useTranslate()
  const generateCSV = useCallback(() => {
    setIsLoading(true)

    try {
      const report: ReportRow[] = []
      for (const txId of txIds) {
        const tx = allTxs[txId]
        const transfers = getTransfers(tx, assets)
        const type = getTxType(tx, transfers)
        const feeAsset = tx.fee ? assets[tx.fee?.assetId] : undefined

        const typeLabel = (() => {
          if (type === 'common') return 'transactionRow.common'
          if (tx.data?.method) return `transactionRow.parser.${tx.data.parser}.${tx.data.method}`
          return `transactionHistory.transactionTypes.${type}`
        })()

        const base = {
          txid: tx.txid,
          type: translate(typeLabel),
          status: translate(`transactionRow.${tx.status.toLowerCase()}`),
          date: toReportDate(tx.blockTime),
        }

        const fee =
          tx.fee && feeAsset
            ? {
                feeAmount: toAmount(tx.fee.value, feeAsset.precision),
                feeCurrency: feeAsset.symbol,
              }
            : noFee

        // The fee is paid once per tx, so only the first leg carries it
        const feeAssetId = getChainAdapterManager().get(tx.chainId)?.getFeeAssetId()

        getReportLegs(transfers, feeAssetId).forEach((leg, i) => {
          report.push({ ...base, ...(i === 0 ? fee : noFee), ...leg })
        })
      }

      const data = toCsv(report)
      const filename = `${translate('transactionHistory.csv.fileName')} - ${dayjs().format(
        'HH:mm A, MMMM DD, YYYY',
      )}.csv`
      fileDownload(data, filename)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [allTxs, assets, translate, txIds])

  return isLargerThanLg && !isCompact ? (
    <Button
      ml={buttonMargin}
      colorScheme='blue'
      variant='ghost-filled'
      isLoading={isLoading}
      onClick={generateCSV}
    >
      <Text translation='transactionHistory.downloadCSV' />
    </Button>
  ) : (
    <IconButton
      aria-label={translate('transactionHistory.downloadCSV')}
      icon={downloadIcon}
      size='md'
      ml={2}
      isLoading={isLoading}
      onClick={generateCSV}
    />
  )
}
