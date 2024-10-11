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
  shapeShiftRevenue: number
  setShapeShiftRevenue: (val: number) => void
  depositAmount: number
  setDepositAmount: (val: number) => void
  maxDepositAmount: string | undefined
}

const DEFAULT_DEPOSIT_AMOUNT = 10000
const MIN_DEPOSIT_AMOUNT = 0

const DEFAULT_SHAPESHIFT_REVENUE = 10000
const MAX_SHAPESHIFT_REVENUE = 10000
const MIN_SHAPESHIFT_REVENUE = 10000

export const RFOXSliders: React.FC<RFOXSlidersProps> = ({
  shapeShiftRevenue,
  setShapeShiftRevenue,
  depositAmount,
  setDepositAmount,
  maxDepositAmount,
}) => {
  return (
    <VStack height='100%' spacing={8} mt={6}>
      <Stack spacing={4} width='full'>
        <Flex width='full' justifyContent='space-between' fontWeight='medium'>
          <Text translation='foxPage.rfox.depositAmount' />
          <Amount.Crypto
            value={depositAmount.toString()}
            symbol='FOX'
            fontWeight='bold'
            maximumFractionDigits={0}
          />
        </Flex>
        <Stack width='100%'>
          <Slider
            min={MIN_DEPOSIT_AMOUNT}
            max={bnOrZero(maxDepositAmount).toNumber()}
            value={depositAmount}
            defaultValue={DEFAULT_DEPOSIT_AMOUNT}
            onChange={setDepositAmount}
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
          <Text translation='foxPage.rfox.shapeshiftRevenue' />
          <Amount.Fiat fiatType='USD' value={shapeShiftRevenue} fontWeight='bold' />
        </Flex>
        <Stack width='100%'>
          <Slider
            min={MIN_SHAPESHIFT_REVENUE}
            max={MAX_SHAPESHIFT_REVENUE}
            value={shapeShiftRevenue}
            defaultValue={DEFAULT_SHAPESHIFT_REVENUE}
            onChange={setShapeShiftRevenue}
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
