import { Button, ButtonGroup } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { BuySellAction } from '../BuySell'

export const BuySellActionButtons = ({
  action,
  setAction
}: {
  action: BuySellAction
  setAction: (action: BuySellAction) => void
}) => {
  const translate = useTranslate()

  return (
    <ButtonGroup variant='ghost' colorScheme='blue' pt={6}>
      <Button isActive={action === BuySellAction.Buy} onClick={() => setAction(BuySellAction.Buy)}>
        {translate('buysell.buy')}
      </Button>
      <Button
        isActive={action === BuySellAction.Sell}
        onClick={() => setAction(BuySellAction.Sell)}
      >
        {translate('buysell.sell')}
      </Button>
    </ButtonGroup>
  )
}
