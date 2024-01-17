import { TriangleDownIcon } from '@chakra-ui/icons'
import {
  Center,
  Flex,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Stack,
  VStack,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from 'lib/bignumber/bignumber'
import { FEE_CURVE_NO_FEE_THRESHOLD_USD } from 'lib/fees/parameters'

import { CHART_TRADE_SIZE_MAX_FOX, CHART_TRADE_SIZE_MAX_USD, labelStyles } from './common'
import type { FeeSlidersProps } from './FeeExplainer'

export const FeeSliders: React.FC<FeeSlidersProps> = ({
  tradeSize,
  setTradeSize,
  foxHolding,
  setFoxHolding,
  isLoading,
  currentFoxHoldings,
}) => {
  const translate = useTranslate()
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  return (
    <VStack height='100%' spacing={8} mt={6}>
      <Stack spacing={4} width='full'>
        <Flex width='full' justifyContent='space-between' fontWeight='medium'>
          <Text translation='foxDiscounts.foxPower' />
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={foxHolding.toString()}
              symbol='FOX'
              fontWeight='bold'
              maximumFractionDigits={0}
            />
          </Skeleton>
        </Flex>
        <Stack width='100%'>
          <Slider
            min={0}
            max={CHART_TRADE_SIZE_MAX_FOX}
            value={foxHolding}
            defaultValue={Number(currentFoxHoldings)}
            onChange={setFoxHolding}
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
                bn(currentFoxHoldings).gt(CHART_TRADE_SIZE_MAX_FOX)
                  ? CHART_TRADE_SIZE_MAX_FOX
                  : Number(currentFoxHoldings)
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
        <Flex width='full' justifyContent='space-between' fontWeight='medium'>
          <Text translation='foxDiscounts.tradeSize' />
          <Amount.Fiat value={tradeSize} fontWeight='bold' />
        </Flex>
        <Stack width='100%' pb={8}>
          <Slider min={0} max={CHART_TRADE_SIZE_MAX_USD} value={tradeSize} onChange={setTradeSize}>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.2} {...labelStyles}>
              <Amount.Fiat value={CHART_TRADE_SIZE_MAX_USD * 0.2} abbreviated />
            </SliderMark>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.5} {...labelStyles}>
              <Amount.Fiat value={CHART_TRADE_SIZE_MAX_USD * 0.5} abbreviated />
            </SliderMark>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.8} {...labelStyles}>
              <Amount.Fiat value={CHART_TRADE_SIZE_MAX_USD * 0.8} abbreviated={true} />
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
            threshold: toFiat(FEE_CURVE_NO_FEE_THRESHOLD_USD),
          })}
        </RawText>
        <Flex gap={2} alignItems='center' justifyContent='space-between' fontSize='sm'>
          <Flex gap={2} alignItems='center'>
            <Center boxSize={2} bg='yellow.500' borderRadius='full' />
            <RawText>{translate('foxDiscounts.currentFoxPower')}</RawText>
          </Flex>
          <Amount.Crypto
            fontWeight='bold'
            value={currentFoxHoldings}
            symbol='FOX'
            maximumFractionDigits={0}
          />
        </Flex>
      </Flex>
    </VStack>
  )
}
