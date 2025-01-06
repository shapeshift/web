import { TriangleDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Flex,
  Input,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Stack,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import {
  FEE_CURVE_PARAMETERS,
  FEE_MODEL_TO_FEATURE_NAME,
  FEE_MODEL_TO_FEATURE_NAME_PLURAL,
} from 'lib/fees/parameters'
import type { ParameterModel } from 'lib/fees/parameters/types'

import { CHART_TRADE_SIZE_MAX_FOX, CHART_TRADE_SIZE_MAX_USD, labelStyles } from './common'

const inputStyle = {
  input: {
    fontWeight: 'bold',
    textAlign: 'right',
  },
}

export type FeeSlidersProps = {
  tradeSizeUSD: number
  setTradeSizeUSD: (val: number) => void
  simulatedFoxHolding: number
  setSimulatedFoxHolding: (val: number) => void
  actualFoxHoldings: string
  isLoading?: boolean
  feeModel: ParameterModel
}

export const FeeSliders: React.FC<FeeSlidersProps> = ({
  tradeSizeUSD,
  setTradeSizeUSD,
  simulatedFoxHolding,
  setSimulatedFoxHolding,
  isLoading,
  actualFoxHoldings,
  feeModel,
}) => {
  const [hasUserAdjustedFoxHolding, setHasUserAdjustedFoxHolding] = useState(false)

  useEffect(() => {
    if (!hasUserAdjustedFoxHolding) {
      setSimulatedFoxHolding(Number(actualFoxHoldings))
    }
  }, [actualFoxHoldings, setSimulatedFoxHolding, hasUserAdjustedFoxHolding])

  const handleSliderChange = useCallback(
    (value: number) => {
      setHasUserAdjustedFoxHolding(true)
      setSimulatedFoxHolding(value)
    },
    [setSimulatedFoxHolding],
  )

  const { FEE_CURVE_NO_FEE_THRESHOLD_USD } = FEE_CURVE_PARAMETERS[feeModel]
  const translate = useTranslate()
  const feature = translate(FEE_MODEL_TO_FEATURE_NAME[feeModel])
  const featureSizeTranslation: TextPropTypes['translation'] = useMemo(
    () => ['foxDiscounts.featureSize', { feature }],
    [feature],
  )
  const featurePlural = translate(FEE_MODEL_TO_FEATURE_NAME_PLURAL[feeModel])
  const {
    number: { toFiat, localeParts },
  } = useLocaleFormatter()

  const handleSetSimulatedFoxHolding = useCallback(
    (values: NumberFormatValues) => {
      setHasUserAdjustedFoxHolding(true)
      setSimulatedFoxHolding(bnOrZero(values.value).toNumber())
    },
    [setSimulatedFoxHolding],
  )

  const handleSetTradeSizeUsd = useCallback(
    (values: NumberFormatValues) => {
      setTradeSizeUSD(bnOrZero(values.value).toNumber())
    },
    [setTradeSizeUSD],
  )

  return (
    <VStack height='100%' spacing={8} mt={6}>
      <Stack spacing={4} width='full'>
        <Flex width='full' justifyContent='space-between' alignItems='center' fontWeight='medium'>
          <Text translation='foxDiscounts.foxPower' />
          <Skeleton isLoaded={!isLoading || hasUserAdjustedFoxHolding} width='35%'>
            <Box sx={inputStyle}>
              <NumberFormat
                decimalScale={2}
                customInput={Input}
                isNumericString={true}
                inputMode='decimal'
                suffix={' FOX'}
                decimalSeparator={localeParts.decimal}
                thousandSeparator={localeParts.group}
                value={simulatedFoxHolding}
                onValueChange={handleSetSimulatedFoxHolding}
              />
            </Box>
          </Skeleton>
        </Flex>
        <Stack width='100%'>
          <Slider
            min={0}
            max={CHART_TRADE_SIZE_MAX_FOX}
            value={simulatedFoxHolding}
            defaultValue={Number(actualFoxHoldings)}
            onChange={handleSliderChange}
            focusThumbOnChange={false}
          >
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <SliderThumb />
            <SliderMark value={250000} {...labelStyles}>
              250k
            </SliderMark>
            <SliderMark value={500000} {...labelStyles}>
              500k
            </SliderMark>
            <SliderMark value={750000} {...labelStyles}>
              750k
            </SliderMark>
            <SliderMark value={1000000} {...labelStyles}>
              1MM
            </SliderMark>
            <SliderMark
              value={
                bn(actualFoxHoldings).gt(CHART_TRADE_SIZE_MAX_FOX)
                  ? CHART_TRADE_SIZE_MAX_FOX
                  : Number(actualFoxHoldings)
              }
              top='-14px !important'
              color='yellow.500'
            >
              <TriangleDownIcon position='absolute' left='-2' />
            </SliderMark>
          </Slider>
        </Stack>
      </Stack>
      <Stack width='full' spacing={4}>
        <Flex width='full' justifyContent='space-between' alignItems='center' fontWeight='medium'>
          <Text translation={featureSizeTranslation} />
          <Box sx={inputStyle} width='35%'>
            <NumberFormat
              decimalScale={2}
              customInput={Input}
              isNumericString={true}
              prefix='$'
              decimalSeparator={localeParts.decimal}
              thousandSeparator={localeParts.group}
              inputMode='decimal'
              value={tradeSizeUSD}
              onValueChange={handleSetTradeSizeUsd}
            />
          </Box>
        </Flex>
        <Stack width='100%' pb={8}>
          <Slider
            min={0}
            max={CHART_TRADE_SIZE_MAX_USD}
            value={tradeSizeUSD}
            onChange={setTradeSizeUSD}
            focusThumbOnChange={false}
          >
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.2} {...labelStyles}>
              <Amount.Fiat fiatType='USD' value={CHART_TRADE_SIZE_MAX_USD * 0.2} abbreviated />
            </SliderMark>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.5} {...labelStyles}>
              <Amount.Fiat fiatType='USD' value={CHART_TRADE_SIZE_MAX_USD * 0.5} abbreviated />
            </SliderMark>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.8} {...labelStyles}>
              <Amount.Fiat
                fiatType='USD'
                value={CHART_TRADE_SIZE_MAX_USD * 0.8}
                abbreviated={true}
              />
            </SliderMark>
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Stack>
      </Stack>
      <Flex alignItems='center' justifyContent='center' width='full' flexWrap='wrap' gap={2}>
        <RawText fontSize='sm'>
          {translate('foxDiscounts.freeUnderThreshold', {
            threshold: toFiat(FEE_CURVE_NO_FEE_THRESHOLD_USD, { fiatType: 'USD' }),
            feature: featurePlural,
          })}
        </RawText>
        <Flex gap={2} alignItems='center' justifyContent='space-between' fontSize='sm'>
          <Flex gap={2} alignItems='center'>
            <Center boxSize={2} bg='yellow.500' borderRadius='full' />
            <RawText>{translate('foxDiscounts.currentFoxPower')}</RawText>
          </Flex>
          <Amount.Crypto
            fontWeight='bold'
            value={actualFoxHoldings}
            symbol='FOX'
            maximumFractionDigits={0}
          />
        </Flex>
      </Flex>
    </VStack>
  )
}
