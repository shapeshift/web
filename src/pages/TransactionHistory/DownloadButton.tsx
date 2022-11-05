import { Button, useMediaQuery } from '@chakra-ui/react'
import { TransferType } from '@keepkey/unchained-client'
import dayjs from 'dayjs'
import fileDownload from 'js-file-download'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import {
  getBuyTransfer,
  getSellTransfer,
  getStandardTx,
  isSupportedContract,
} from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { selectAssetsByMarketCap, selectTxs } from 'state/slices/selectors'
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
  const assets = useAppSelector(selectAssetsByMarketCap)
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
    let report: ReportRow[] = []
    for (let index = 0; index < txIds.length; index++) {
      const txId = txIds[index]
      const transaction = allTxs[txId]
      const standardTx = getStandardTx(transaction)
      const TxType = isSupportedContract(transaction)
        ? TransferType.Contract
        : standardTx?.type ?? transaction.trade?.type ?? ''
      const buyTransfer = getBuyTransfer(transaction)
      const sellTransfer = getSellTransfer(transaction)
      const feeAsset = assets.find(asset => asset.assetId === transaction.fee?.assetId)
      const input = standardTx ?? sellTransfer ?? null
      const inputAssetId = input?.assetId ?? null
      const output = standardTx ?? buyTransfer ?? null
      const outputAssetId = output?.assetId ?? null
      const inputAsset = inputAssetId ? assets.find(asset => asset.assetId === inputAssetId) : null
      const outputAsset = outputAssetId
        ? assets.find(asset => asset.assetId === outputAssetId)
        : null
      report.push({
        txid: transaction.txid,
        type: translate(
          TxType
            ? `transactionHistory.transactionTypes.${TxType}`
            : transaction.data
            ? `transactionRow.parser.${transaction.data?.parser}.${transaction.data?.method}`
            : 'transactionRow.unknown',
        ),
        status: translate(`transactionRow.${transaction.status}`),
        timestamp: dayjs(transaction.blockTime * 1000).toISOString(),
        minerFee:
          transaction.fee && feeAsset
            ? bnOrZero(fromBaseUnit(transaction.fee.value, feeAsset.precision)).toString()
            : '0',
        minerFeeCurrency: feeAsset?.symbol ?? '-',
        inputAmount:
          input && inputAsset
            ? bnOrZero(fromBaseUnit(input.value, inputAsset.precision)).toString()
            : '-',
        inputCurrency: inputAsset?.symbol ?? '-',
        inputAddress: input?.from ?? '-',
        outputAmount:
          output && outputAsset
            ? bnOrZero(fromBaseUnit(output.value, outputAsset.precision)).toString()
            : '-',
        outputCurrency: outputAsset?.symbol ?? '-',
        outputAddress: output?.to ?? '-',
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
