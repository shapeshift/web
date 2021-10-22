import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { AssetMarketData } from 'hooks/useAsset/useAsset'
import { Transactions } from 'pages/Assets/components/Transactions/Transactions'
export const AssetHistory = ({ asset }: { asset: AssetMarketData }) => {
  const translate = useTranslate()
  const { chain, tokenId, symbol } = asset
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          {translate('assets.assetDetails.assetHistory.transactionHistory')}
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <Transactions chain={chain} contractAddress={tokenId} symbol={symbol?.toUpperCase()} />
      </Card.Body>
    </Card>
  )
}
