import { Button, ButtonGroup } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { BuySellAction, BuySellActionType } from '../BuySell'

export const BuySellActionButtons = ({
  action,
  setAction
}: {
  action: BuySellActionType
  setAction: (action: BuySellActionType) => void
}) => {
  const translate = useTranslate()

  return (
    <ButtonGroup variant='ghost' colorScheme='blue' pt={6}>
      <Button isActive={action === BuySellAction.Buy} onClick={() => setAction(BuySellAction.Buy)}>
        {translate('common.buy')}
      </Button>
      <Button
        isActive={action === BuySellAction.Sell}
        onClick={() => setAction(BuySellAction.Sell)}
      >
        {translate('common.sell')}
      </Button>
    </ButtonGroup>
  )
}
