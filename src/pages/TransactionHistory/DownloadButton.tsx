import { Button, useMediaQuery } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useJsonToCsv } from 'react-json-csv'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { selectTxs } from 'state/slices/selectors'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

type ReportRow = {
  txid: TxId
  status: string
  timestamp: string
}

export const DownloadButton = ({ txIds }: { txIds: TxId[] }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)
  const allTxs = useAppSelector(selectTxs)
  const { saveAsCsv } = useJsonToCsv()
  const translate = useTranslate()
  const fields = {
    txid: translate('transactionHistory.csv.txid'),
    status: translate('transactionHistory.csv.status'),
    timestamp: translate('transactionHistory.csv.timestamp')
  }

  const generateCSV = () => {
    setIsLoading(true)
    let report: ReportRow[] = []
    for (let index = 0; index < txIds.length; index++) {
      const txId = txIds[index]
      const transaction = allTxs[txId]
      console.info(transaction)
      report.push({
        txid: transaction.txid,
        status: translate(transaction.status),
        timestamp: dayjs(transaction.blockTime * 1000).toISOString()
      })
    }
    try {
      saveAsCsv({
        data: report,
        fields,
        filename: `${translate('transactionHistory.csv.fileName')} - ${dayjs().format(
          'HH:mm A, MMMM DD, YYYY'
        )}`
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
