import { TriangleDownIcon } from '@chakra-ui/icons'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Divider,
  Flex,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  VStack,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'

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
  return (
    <VStack height='100%' spacing={0} mb={8} divider={<Divider />}>
      <Card width='full' variant='unstyled' boxShadow='none'>
        <CardHeader display='flex' width='full' justifyContent='space-between' fontWeight='medium'>
          <Text translation='foxDiscounts.foxPower' />
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto value={foxHolding.toString()} symbol='FOX' />
          </Skeleton>
        </CardHeader>
        <CardBody width='100%'>
          <Slider
            min={0}
            max={CHART_TRADE_SIZE_MAX_FOX}
            value={foxHolding}
            onChange={setFoxHolding}
          >
            <SliderTrack>
              <SliderFilledTrack />
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
            <SliderMark value={Number(currentFoxHoldings)} top='-10px !important' color='blue.500'>
              <TriangleDownIcon />
            </SliderMark>
          </Slider>
        </CardBody>
        <CardFooter display='flex' width='full' alignItems='center' justifyContent='space-between'>
          <Flex gap={2} alignItems='center'>
            <Center boxSize={2} bg='blue.500' borderRadius='full' />
            <RawText>{translate('foxDiscounts.currentFoxPower')}</RawText>
          </Flex>
          <Amount.Crypto value={currentFoxHoldings} symbol='FOX' maximumFractionDigits={0} />
        </CardFooter>
      </Card>
      <Card width='full' variant='unstyled' boxShadow='none'>
        <CardHeader display='flex' width='full' justifyContent='space-between' fontWeight='medium'>
          <Text translation='foxDiscounts.tradeSize' />
          <Amount.Fiat value={tradeSize} />
        </CardHeader>
        <CardBody width='100%' pb={8}>
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
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </CardBody>
      </Card>
    </VStack>
  )
}
