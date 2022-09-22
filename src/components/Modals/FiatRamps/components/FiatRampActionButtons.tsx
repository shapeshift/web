import { Button, ButtonGroup, Tab, TabList, Tabs } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { FiatRampAction } from '../FiatRampsCommon'

const actions = ['Buy', 'Sell']

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

  const commonButtonProps = {
    pt: 4,
    pb: 4,
    pl: 10,
    pr: 10,
  }

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
      {/* <ButtonGroup variant='ghost' colorScheme='blue'>
      {supportsBuy ? (
        <Button
          {...commonButtonProps}
          isActive={action === FiatRampAction.Buy}
          onClick={() => setAction(FiatRampAction.Buy)}
        >
          {translate('fiatRamps.buy')}
        </Button>
      ) : null}
      {supportsSell ? (
        <Button
          {...commonButtonProps}
          isActive={action === FiatRampAction.Sell}
          onClick={() => setAction(FiatRampAction.Sell)}
        >
          {translate('fiatRamps.sell')}
        </Button>
      ) : null}
    </ButtonGroup> */}
    </Tabs>
  )
}
