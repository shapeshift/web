import { Button, IconButton, useMediaQuery } from '@chakra-ui/react'
import { BigAmount } from '@shapeshiftoss/utils'
import dayjs from 'dayjs'
import fileDownload from 'js-file-download'
import { useCallback, useMemo, useState } from 'react'
import { TbDownload } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import type { ReportLeg } from './utils'
import { getReportLegs, toReportDate } from './utils'

import { Text } from '@/components/Text'
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

const jsonToCsv = (fields: Record<string, string>, rows: ReportRow[]): string => {
  const csvRows = [
    Object.values(fields).join(','), // header
    ...rows.map(row => Object.values(row).join(',')), // data
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
  const fields = useMemo(
    () => ({
      txid: translate('transactionHistory.csv.txid'),
      type: translate('transactionHistory.csv.type'),
      status: translate('transactionHistory.csv.status'),
      date: translate('transactionHistory.csv.date'),
      feeAmount: translate('transactionHistory.csv.feeAmount'),
      feeCurrency: translate('transactionHistory.csv.feeCurrency'),
      sentAmount: translate('transactionHistory.csv.sentAmount'),
      sentCurrency: translate('transactionHistory.csv.sentCurrency'),
      sentAddresses: translate('transactionHistory.csv.sentAddress'),
      receivedAmount: translate('transactionHistory.csv.receivedAmount'),
      receivedCurrency: translate('transactionHistory.csv.receivedCurrency'),
      receivedAddresses: translate('transactionHistory.csv.receivedAddress'),
    }),
    [translate],
  )

  const generateCSV = useCallback(() => {
    setIsLoading(true)

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

      const fee =
        tx.fee && feeAsset
          ? {
              feeAmount: BigAmount.fromBaseUnit({
                value: tx.fee.value,
                precision: feeAsset.precision,
              }).toPrecision(),
              feeCurrency: feeAsset.symbol,
            }
          : noFee

      // The fee is paid once per tx, so only the first leg carries it
      getReportLegs(transfers).forEach((leg, i) => {
        report.push({
          txid: `"${tx.txid}"`,
          type: translate(typeLabel),
          status: translate(`transactionRow.${tx.status.toLowerCase()}`),
          date: toReportDate(tx.blockTime),
          ...(i === 0 ? fee : noFee),
          ...leg,
        })
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
  }, [allTxs, assets, fields, translate, txIds])

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
