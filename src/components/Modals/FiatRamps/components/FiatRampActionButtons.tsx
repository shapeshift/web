import { Button, ButtonGroup } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { FiatRampAction } from '../FiatRampsCommon'

export const FiatRampActionButtons = ({
  action,
  setAction,
}: {
  action: FiatRampAction
  setAction: (action: FiatRampAction) => void
}) => {
  const translate = useTranslate()

  const commonButtonProps = {
    pt: 4,
    pb: 4,
    pl: 10,
    pr: 10,
  }

  return (
    <ButtonGroup variant='ghost' colorScheme='blue'>
      <Button
        {...commonButtonProps}
        isActive={action === FiatRampAction.Buy}
        onClick={() => setAction(FiatRampAction.Buy)}
      >
        {translate('fiatRamps.buy')}
      </Button>
      <Button
        {...commonButtonProps}
        isActive={action === FiatRampAction.Sell}
        onClick={() => setAction(FiatRampAction.Sell)}
      >
        {translate('fiatRamps.sell')}
      </Button>
    </ButtonGroup>
  )
}
