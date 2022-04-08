import { Button, useMediaQuery } from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useJsonToCsv } from 'react-json-csv'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import {
  getBuyTransfer,
  getSellTransfer,
  getStandardTx,
  isSupportedContract,
} from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAssetsByMarketCap, selectTxs } from 'state/slices/selectors'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
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

export const DownloadButton = ({ txIds }: { txIds: TxId[] }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)
  const allTxs = useAppSelector(selectTxs)
  const assets = useAppSelector(selectAssetsByMarketCap)
  const { saveAsCsv } = useJsonToCsv()
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
      const txType = isSupportedContract(transaction)
        ? chainAdapters.TxType.Contract
        : standardTx?.type ?? transaction.tradeDetails?.type ?? ''
      const buyTransfer = getBuyTransfer(transaction)
      const sellTransfer = getSellTransfer(transaction)
      const feeAsset = assets.find(asset => asset.caip19 === transaction.fee?.caip19)
      const input = standardTx ?? sellTransfer ?? null
      const inputCaip19 = input?.caip19 ?? null
      const output = standardTx ?? buyTransfer ?? null
      const outputCaip19 = output?.caip19 ?? null
      const inputAsset = inputCaip19 ? assets.find(asset => asset.caip19 === inputCaip19) : null
      const outputAsset = outputCaip19 ? assets.find(asset => asset.caip19 === outputCaip19) : null
      report.push({
        txid: transaction.txid,
        type: translate(
          txType
            ? `transactionHistory.transactionTypes.${txType}`
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
      saveAsCsv({
        data: report,
        fields,
        filename: `${translate('transactionHistory.csv.fileName')} - ${dayjs().format(
          'HH:mm A, MMMM DD, YYYY',
        )}`,
      })
    } catch (error) {
      console.error(error)
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
