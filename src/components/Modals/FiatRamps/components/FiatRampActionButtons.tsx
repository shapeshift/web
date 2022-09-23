import { Tab, TabList, Tabs } from '@chakra-ui/react'
import { useMemo } from 'react'
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

  const activeIndex = useMemo(() => {
    if (action === FiatRampAction.Sell) {
      return 1
    } else {
      return 0
    }
  }, [action])

  return (
    <Tabs isFitted variant='enclosed' isManual index={activeIndex}>
      <TabList>
        <Tab onClick={() => setAction(FiatRampAction.Buy)} borderRadius={0}>
          {translate('fiatRamps.buy')}
        </Tab>
        <Tab onClick={() => setAction(FiatRampAction.Sell)} borderRadius={0}>
          {translate('fiatRamps.sell')}
        </Tab>
      </TabList>
    </Tabs>
  )
}
