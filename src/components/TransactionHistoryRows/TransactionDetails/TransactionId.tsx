import { TransactionLink } from 'components/TransactionHistoryRows/TransactionLink'

import { Row } from './Row'

export const TransactionId = ({ txLink, txid }: { txLink: string; txid: string }) => {
  return (
    <Row title='txid'>
      <TransactionLink txLink={txLink} txid={txid} />
    </Row>
  )
}
