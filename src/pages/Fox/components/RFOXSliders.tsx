import {
  Flex,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  VStack,
} from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

export type RFOXSlidersProps = {
  shapeShiftRevenues: number
  setShapeShiftRevenues: (val: number) => void
  foxHolding: number
  setFoxHolding: (val: number) => void
  maxFoxHolding: string | undefined
}

export const RFOXSliders: React.FC<RFOXSlidersProps> = ({
  shapeShiftRevenues,
  setShapeShiftRevenues,
  foxHolding,
  setFoxHolding,
  maxFoxHolding,
}) => {
  return (
    <VStack height='100%' spacing={8} mt={6}>
      <Stack spacing={4} width='full'>
        <Flex width='full' justifyContent='space-between' fontWeight='medium'>
          <Text translation='foxPage.rfox.depositAmount' />
          <Amount.Crypto
            value={foxHolding.toString()}
            symbol='FOX'
            fontWeight='bold'
            maximumFractionDigits={0}
          />
        </Flex>
        <Stack width='100%'>
          <Slider
            min={0}
            max={bnOrZero(maxFoxHolding).toNumber()}
            value={foxHolding}
            defaultValue={10000}
            onChange={setFoxHolding}
          >
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Stack>
      </Stack>
      <Stack width='full' spacing={4}>
        <Flex width='full' justifyContent='space-between' fontWeight='medium'>
          <Text translation='foxPage.rfox.shapeshiftRevenues' />
          <Amount.Fiat fiatType='USD' value={shapeShiftRevenues} fontWeight='bold' />
        </Flex>
        <Stack width='100%'>
          <Slider
            min={0}
            max={1000000}
            value={shapeShiftRevenues}
            defaultValue={10000}
            onChange={setShapeShiftRevenues}
          >
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Stack>
      </Stack>
    </VStack>
  )
}
