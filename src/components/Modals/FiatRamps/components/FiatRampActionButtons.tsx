import { Tab, TabList, Tabs } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { FiatRampAction } from '../FiatRampsCommon'

export const FiatRampActionButtons = ({
  action,
  setAction,
  supportsBuy,
  supportsSell,
}: {
  action: FiatRampAction
  setAction: (action: FiatRampAction) => void
  supportsBuy: boolean
  supportsSell: boolean
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
        {supportsBuy && (
          <Tab onClick={() => setAction(FiatRampAction.Buy)} borderRadius={0}>
            {translate('fiatRamps.buy')}
          </Tab>
        )}
        {supportsSell && (
          <Tab onClick={() => setAction(FiatRampAction.Sell)} borderRadius={0}>
            {translate('fiatRamps.sell')}
          </Tab>
        )}
      </TabList>
    </Tabs>
  )
}
