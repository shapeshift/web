import { TransactionLink } from 'components/TransactionHistoryRows/TransactionLink'

import { Row } from './Row'

export const TransactionId = ({
  explorerTxLink,
  txid,
}: {
  explorerTxLink: string
  txid: string
}) => {
  return (
    <Row title='txid'>
      <TransactionLink explorerTxLink={explorerTxLink} txid={txid} />
    </Row>
  )
}
