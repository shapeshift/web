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
import { useCallback } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
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
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const handleShapeShiftRevenueChange = useCallback(
    (values: NumberFormatValues) => {
      setShapeShiftRevenue(bnOrZero(values.value).toNumber())
    },
    [setShapeShiftRevenue],
  )

  const handleDepositAmountChange = useCallback(
    (values: NumberFormatValues) => {
      setDepositAmount(bnOrZero(values.value).toNumber())
    },
    [setDepositAmount],
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
              inputMode='decimal'
              suffix={' FOX'}
              decimalSeparator={localeParts.decimal}
              thousandSeparator={localeParts.group}
              value={depositAmount.toString()}
              onValueChange={handleDepositAmountChange}
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
            focusThumbOnChange={false}
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
              inputMode='decimal'
              suffix={localeParts.postfix ? '$' : ''}
              prefix={localeParts.prefix ? '$' : ''}
              decimalSeparator={localeParts.decimal}
              thousandSeparator={localeParts.group}
              value={shapeShiftRevenue}
              onValueChange={handleShapeShiftRevenueChange}
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
            focusThumbOnChange={false}
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
