import { Button, ButtonGroup, Tab, TabList, Tabs } from '@chakra-ui/react'
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

  const commonButtonProps = {
    pt: 4,
    pb: 4,
    pl: 10,
    pr: 10,
  }

  return (
    <Tabs isFitted variant='enclosed'>
      <TabList>
        {supportsBuy && (
          <Tab
            isSelected={action === FiatRampAction.Buy}
            onClick={() => setAction(FiatRampAction.Buy)}
            borderRadius={0}
          >
            {translate('fiatRamps.buy')}
          </Tab>
        )}
        {supportsSell && (
          <Tab
            isSelected={action === FiatRampAction.Sell}
            onClick={() => setAction(FiatRampAction.Sell)}
            borderRadius={0}
          >
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
