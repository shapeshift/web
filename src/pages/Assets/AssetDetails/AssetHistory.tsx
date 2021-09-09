import { AssetMarketData } from '@shapeshiftoss/market-service'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Transactions } from 'components/Transactions/Transactions'

export const AssetHistory = ({ asset }: { asset: AssetMarketData }) => {
  const translate = useTranslate()
  const { network, contractAddress, symbol } = asset
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.transactionHistory')}
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Transactions
          chain={network}
          contractAddress={contractAddress}
          symbol={symbol?.toUpperCase()}
        />
      </Card.Body>
    </Card>
  )
}
