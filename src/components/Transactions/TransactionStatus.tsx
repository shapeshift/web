import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Tag } from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'

export const TransactionStatus = ({ txStatus }: { txStatus: chainAdapters.TxStatus }) => {
  const status = (() => {
    switch (txStatus) {
      case chainAdapters.TxStatus.Confirmed:
        return (
          <>
            <Tag colorScheme='green' size='lg'>
              <CheckCircleIcon mr={2} />
              <Text translation='transactionRow.confirmed' />
            </Tag>
          </>
        )
      case chainAdapters.TxStatus.Pending:
        return (
          <>
            <Tag colorScheme='blue' size='lg'>
              <CircularProgress mr={2} size='5' />
              <Text translation='transactionRow.pending' />
            </Tag>
          </>
        )
      default:
        return (
          <>
            <Tag colorScheme='red' size='lg'>
              <WarningTwoIcon mr={2} />
              <Text translation='transactionRow.failed' />
            </Tag>
          </>
        )
    }
  })()

  return (
    <>
      <Row variant='vertical'>
        <Row.Label>
          <Text translation='transactionRow.status' />
        </Row.Label>
        <Row.Value textAlign='left'>{status}</Row.Value>
      </Row>
    </>
  )
}
