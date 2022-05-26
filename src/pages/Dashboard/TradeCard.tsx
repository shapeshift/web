import { AssetId } from '@shapeshiftoss/caip'
import { Card } from 'components/Card/Card'
import { Trade } from 'components/Trade/Trade'

type TradeCardProps = {
  defaultBuyAssetId?: AssetId
}

export const TradeCard = ({ defaultBuyAssetId }: TradeCardProps) => {
  return (
    <Card flex={1} variant='outline'>
      <Card.Body>
        <Trade defaultBuyAssetId={defaultBuyAssetId} />
      </Card.Body>
    </Card>
  )
}
