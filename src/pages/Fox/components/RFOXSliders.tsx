import {
  Box,
  Flex,
  Input,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  VStack,
} from '@chakra-ui/react'
import debounce from 'lodash/debounce'
import { useCallback, useMemo } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
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
const MAX_SHAPESHIFT_REVENUE = 1000000
const MIN_SHAPESHIFT_REVENUE = 0

const inputStyle = {
  input: {
    fontWeight: 'bold',
    textAlign: 'right',
  },
}

export const RFOXSliders: React.FC<RFOXSlidersProps> = ({
  shapeShiftRevenue,
  setShapeShiftRevenue,
  depositAmount,
  setDepositAmount,
  maxDepositAmount,
}) => {
  const handleShapeShiftRevenueChange = useCallback(
    (values: NumberFormatValues) => {
      setShapeShiftRevenue(bnOrZero(values.value).toNumber())
    },
    [setShapeShiftRevenue],
  )

  const debounceShapeShiftRevenuChange = useMemo(
    () => debounce(handleShapeShiftRevenueChange, 1000),
    [handleShapeShiftRevenueChange],
  )

  const handleDepositAmountChange = useCallback(
    (values: NumberFormatValues) => {
      setDepositAmount(bnOrZero(values.value).toNumber())
    },
    [setDepositAmount],
  )

  const debounceDepositAmountChange = useMemo(
    () => debounce(handleDepositAmountChange, 1000),
    [handleDepositAmountChange],
  )

  return (
    <VStack height='100%' spacing={8} mt={6}>
      <Stack spacing={4} width='full'>
        <Flex width='full' justifyContent='space-between' alignItems='center' fontWeight='medium'>
          <Text translation='foxPage.rfox.depositAmount' />

          <Box width='35%' sx={inputStyle}>
            <NumberFormat
              decimalScale={2}
              customInput={Input}
              isNumericString={true}
              suffix={' FOX'}
              decimalSeparator={'.'}
              inputMode='decimal'
              thousandSeparator={','}
              value={depositAmount.toString()}
              onValueChange={debounceDepositAmountChange}
            />
          </Box>
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
        <Flex width='full' justifyContent='space-between' alignItems='center' fontWeight='medium'>
          <Text width='50%' translation='foxPage.rfox.shapeshiftRevenue' />

          <Box width='35%' sx={inputStyle}>
            <NumberFormat
              decimalScale={2}
              customInput={Input}
              isNumericString={true}
              prefix={'$'}
              decimalSeparator={'.'}
              inputMode='decimal'
              thousandSeparator={','}
              value={shapeShiftRevenue}
              onValueChange={debounceShapeShiftRevenuChange}
            />
          </Box>
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
