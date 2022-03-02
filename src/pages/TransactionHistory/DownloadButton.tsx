import { Button } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useJsonToCsv } from 'react-json-csv'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { selectTxs } from 'state/slices/selectors'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

type ReportRow = {
  txid: TxId
  status: string
  timestamp: string
}

export const DownloadButton = ({ txIds }: { txIds: TxId[] }) => {
  const [isLoading, setIsLoading] = useState(false)
  const allTxs = useAppSelector(selectTxs)
  const { saveAsCsv } = useJsonToCsv()
  const translate = useTranslate()
  const fields = {
    txid: translate('TX ID'),
    status: translate('Status'),
    timestamp: translate('Timestamp')
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
        filename: `ShapeShift Transactions History - ${dayjs().format('HH:mm A, MMMM DD, YYYY')}`
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button colorScheme='blue' variant='ghost-filled' isLoading={isLoading} onClick={generateCSV}>
      <Text translation='transactionHistory.downloadCSV' />
    </Button>
  )
}
