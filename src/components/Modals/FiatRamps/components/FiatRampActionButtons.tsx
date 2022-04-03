import { Button, ButtonGroup } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { FiatRampAction } from '../FiatRamps'

export const FiatRampActionButtons = ({
  action,
  setAction
}: {
  action: FiatRampAction
  setAction: (action: FiatRampAction) => void
}) => {
  const translate = useTranslate()

  return (
    <ButtonGroup variant='ghost' colorScheme='blue'>
      <Button
        pt={4}
        pb={4}
        pl={10}
        pr={10}
        isActive={action === FiatRampAction.Buy}
        onClick={() => setAction(FiatRampAction.Buy)}
      >
        {translate('fiatRamps.buy')}
      </Button>
      <Button
        pt={4}
        pb={4}
        pl={10}
        pr={10}
        isActive={action === FiatRampAction.Sell}
        onClick={() => setAction(FiatRampAction.Sell)}
      >
        {translate('fiatRamps.sell')}
      </Button>
    </ButtonGroup>
  )
}
