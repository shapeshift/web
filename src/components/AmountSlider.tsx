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

import { Amount } from './Amount/Amount'

type AmountSliderProps = {
  sliderValue: number
  handlePercentageSliderChange: (percentage: number) => void
  handlePercentageSliderChangeEnd: (percentage: number) => void
  onPercentageClick: (percentage: number) => void
}

export const AmountSlider: React.FC<AmountSliderProps> = ({
  sliderValue,
  handlePercentageSliderChange,
  handlePercentageSliderChangeEnd,
  onPercentageClick,
}) => {
  const handlePercentageClick = useCallback(
    (percentage: number) => {
      return () => {
        onPercentageClick(percentage)
      }
    },
    [onPercentageClick],
  )
  return (
    <Stack px={6} py={4} spacing={4}>
      <Amount.Percent value={sliderValue / 100} fontSize='2xl' />
      <Slider
        value={sliderValue}
        onChange={handlePercentageSliderChange}
        onChangeEnd={handlePercentageSliderChangeEnd}
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
    </Stack>
  )
}
