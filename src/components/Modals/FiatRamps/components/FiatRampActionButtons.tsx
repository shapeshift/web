import { Tab, TabList, Tabs } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { FiatRampAction } from '../FiatRampsCommon'

export const FiatRampActionButtons = ({
  action,
  setAction,
}: {
  action: FiatRampAction
  setAction: (action: FiatRampAction) => void
}) => {
  const setBuyAction = useCallback(() => setAction(FiatRampAction.Buy), [setAction])
  const setSellAction = useCallback(() => setAction(FiatRampAction.Sell), [setAction])
  const translate = useTranslate()

  const activeIndex = useMemo(() => Number(action === FiatRampAction.Sell), [action])

  return (
    <Tabs isFitted variant='enclosed' isManual index={activeIndex}>
      <TabList>
        <Tab onClick={setBuyAction} borderRadius={0}>
          {translate('fiatRamps.buy')}
        </Tab>
        <Tab onClick={setSellAction} borderRadius={0}>
          {translate('fiatRamps.sell')}
        </Tab>
      </TabList>
    </Tabs>
  )
}
