import { Card } from 'components/Card/Card'
import { Trade } from 'components/Trade/Trade'

export const TradeCard = () => {
  return (
    <Card flex={1} variant='outline'>
      <Card.Body>
        <Trade />
      </Card.Body>
    </Card>
  )
}
