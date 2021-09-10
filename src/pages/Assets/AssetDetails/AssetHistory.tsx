import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Transactions } from 'components/Transactions/Transactions'

import { AssetMarketData } from '../../../hooks/useAsset/useAsset'
export const AssetHistory = ({ asset }: { asset: AssetMarketData }) => {
  const translate = useTranslate()
  const { network, tokenId, symbol } = asset
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.transactionHistory')}
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Transactions chain={network} contractAddress={tokenId} symbol={symbol?.toUpperCase()} />
      </Card.Body>
    </Card>
  )
}
