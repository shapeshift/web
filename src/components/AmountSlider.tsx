import {
  Button,
  ButtonGroup,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import type { ControllerRenderProps } from 'react-hook-form'
import { Controller, useFormContext } from 'react-hook-form'
import type { UnstakeInputValues } from 'pages/RFOX/types'

import { Amount } from './Amount/Amount'

type AmountSliderProps = {
  sliderValue: number
  handlePercentageSliderChange: (percentage: number) => void
  handlePercentageSliderChangeEnd: (percentage: number) => void
  onPercentageClick: (percentage: number) => void
}

type RenderController = ({
  field,
}: {
  field: ControllerRenderProps<UnstakeInputValues, 'percentage'>
}) => React.ReactElement

export const AmountSlider: React.FC<AmountSliderProps> = ({
  sliderValue,
  handlePercentageSliderChange,
  handlePercentageSliderChangeEnd,
  onPercentageClick,
}) => {
  // TODO(gomes): this assumes this lives within the context of a form which has a `percentage` field.
  // If we plan to reuse this, which it looks like we do, we should probably use a fallback form context similar to TradeAmountInput.tsx
  const methods = useFormContext<UnstakeInputValues>()

  const { control } = methods

  const renderController: RenderController = useCallback(
    ({ field: { onChange } }) => {
      const handlePercentageClick = (percentage: number) => {
        return () => {
          onPercentageClick(percentage)
          // This is a click, not a slide so we update the form context immediately
          onChange(percentage)
        }
      }

      return (
        <>
          <Slider
            value={sliderValue}
            // eslint-disable-next-line react-memo/require-usememo
            onChange={x => {
              // Only calls the percentage change event handler passed from the parent, but do not set the form context just yet
              handlePercentageSliderChange(x)
            }}
            // eslint-disable-next-line react-memo/require-usememo
            onChangeEnd={x => {
              // Calls the percentage change end event handler passed from the parent, *and* set the form context, informing
              // the parent we are ready here
              handlePercentageSliderChangeEnd(x)
              console.log({ x })
              onChange(x)
            }}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <ButtonGroup size='sm' justifyContent='space-between'>
            <Button onClick={handlePercentageClick(25)} flex={1}>
              25%
            </Button>
            <Button onClick={handlePercentageClick(50)} flex={1}>
              50%
            </Button>
            <Button onClick={handlePercentageClick(75)} flex={1}>
              75%
            </Button>
            <Button onClick={handlePercentageClick(100)} flex={1}>
              Max
            </Button>
          </ButtonGroup>
        </>
      )
    },
    [handlePercentageSliderChange, handlePercentageSliderChangeEnd, onPercentageClick, sliderValue],
  )

  return (
    <Stack px={6} py={4} spacing={4}>
      <Amount.Percent value={sliderValue / 100} fontSize='2xl' />
      <Controller name={'percentage'} render={renderController} control={control} />
    </Stack>
  )
}
