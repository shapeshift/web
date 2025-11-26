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
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'

import { Text } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type RFOXSlidersProps = {
  shapeShiftRevenue: number
  setShapeShiftRevenue: (val: number) => void
  depositAmount: number
  setDepositAmount: (val: number) => void
  maxDepositAmount: string | undefined
  stakingAssetId: AssetId
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
    fontSize: {
      base: 'sm',
      md: 'md',
    },
  },
}

const inputContainerWidth = {
  base: '50%',
  md: '35%',
}

const revenueInputContainerWidth = {
  base: '45%',
  md: '35%',
}

export const RFOXSliders: React.FC<RFOXSlidersProps> = ({
  shapeShiftRevenue,
  setShapeShiftRevenue,
  depositAmount,
  setDepositAmount,
  maxDepositAmount,
  stakingAssetId,
}) => {
  const {
    number: { localeParts },
  } = useLocaleFormatter()
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
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

          <Box width={inputContainerWidth} sx={inputStyle}>
            <NumericFormat
              decimalScale={2}
              customInput={Input}
              valueIsNumericString={true}
              inputMode='decimal'
              suffix={` ${stakingAsset?.symbol ?? ''}`}
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

          <Box width={revenueInputContainerWidth} sx={inputStyle}>
            <NumericFormat
              decimalScale={2}
              customInput={Input}
              valueIsNumericString={true}
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
