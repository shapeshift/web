import { Button } from '@chakra-ui/react'
import { memo } from 'react'

type TradeButtonCellProps = {
  assetId: string
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  translation: string
}

export const TradeButtonCell = memo<TradeButtonCellProps>(({ assetId, onClick, translation }) => (
  <Button data-asset-id={assetId} onClick={onClick}>
    {translation}
  </Button>
))
