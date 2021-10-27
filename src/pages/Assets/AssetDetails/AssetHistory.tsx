import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Transactions } from 'components/Transactions/Transactions'
import { AssetMarketData } from 'hooks/useAsset/useAsset'
export const AssetHistory = ({
  asset,
  currentScriptType
}: {
  asset: AssetMarketData
  currentScriptType: BTCInputScriptType | undefined
}) => {
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
        <Transactions
          chain={chain}
          contractAddress={tokenId}
          symbol={symbol?.toUpperCase()}
          currentScriptType={currentScriptType}
        />
      </Card.Body>
    </Card>
  )
}
