import {
  Button,
  ButtonGroup,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
} from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback } from 'react'
import type { ControllerRenderProps } from 'react-hook-form'
import { Controller, useForm, useFormContext } from 'react-hook-form'

import { Amount } from './Amount/Amount'

type AmountSliderProps = {
  sliderValue: number
  handlePercentageSliderChange: (percentage: number) => void
  handlePercentageSliderChangeEnd: (percentage: number) => void
  onPercentageClick: (percentage: number) => void
} & PropsWithChildren

type AmountSliderInputValues = {
  percentage: number
}

type RenderController = ({
  field,
}: {
  field: ControllerRenderProps<AmountSliderInputValues, 'percentage'>
}) => React.ReactElement

const defaultFormValues = {
  percentage: 100,
}

export const AmountSlider: React.FC<AmountSliderProps> = ({
  sliderValue,
  handlePercentageSliderChange,
  handlePercentageSliderChangeEnd,
  onPercentageClick,
  children,
}) => {
  // Local controller in case consumers don't have a form context
  // If you consume this component, try and leverage the form context for simplicity and to keep things DRY,
  // but also fine to use this component as if the form context didn't exist if you wish to
  const _methods = useForm<AmountSliderInputValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: true,
  })
  const methods = useFormContext<AmountSliderInputValues>()
  const control = methods?.control ?? _methods.control

  const renderController: RenderController = useCallback(
    ({ field: { onChange } }) => {
      const handlePercentageClick = (percentage: number) => {
        return () => {
          onPercentageClick(percentage)
          handlePercentageSliderChangeEnd(percentage)
          // This is a click, not a slide so we update the form context immediately
          onChange(percentage)
        }
      }

      return (
        <>
          <Slider
            value={sliderValue}
            onChange={percentage => {
              // Only calls the percentage change event handler passed from the parent, but do not set the form context just yet
              handlePercentageSliderChange(percentage)
            }}
            onChangeEnd={percentage => {
              // Calls the percentage change end event handler passed from the parent, *and* set the form context, informing
              // the parent we are ready here
              handlePercentageSliderChangeEnd(percentage)
              onChange(percentage)
            }}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          {children}
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
    [
      children,
      handlePercentageSliderChange,
      handlePercentageSliderChangeEnd,
      onPercentageClick,
      sliderValue,
    ],
  )

  return (
    <Stack px={6} py={4} spacing={4}>
      <Amount.Percent value={sliderValue / 100} fontSize='2xl' />
      <Controller name={'percentage'} render={renderController} control={control} />
    </Stack>
  )
}
