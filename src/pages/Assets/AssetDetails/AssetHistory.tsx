import { Card } from 'components/Card'
import { Transactions } from 'components/Transactions/Transactions'
import { useTranslate } from 'react-polyglot'

export const AssetHistory = () => {
  const translate = useTranslate()
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.transactionHistory')}
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Transactions limit={20} />
      </Card.Body>
    </Card>
  )
}
