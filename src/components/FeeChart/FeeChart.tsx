import {
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { Data, Layout, PlotHoverEvent } from 'plotly.js'
import { useState } from 'react'
import Plot from 'react-plotly.js'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { calculateFeeBps } from 'lib/fees/model'

type FeeChartProps = {
  tradeSize: number
  foxHolding: number
  onHover(hoverTradeSize: number, hoverFoxHolding: number): void
}

// how many points to generate for the chart, higher is more accurate but slower
const CHART_GRANULARITY = 100
const CHART_TRADE_SIZE_MAX_USD = 300_000
const CHART_TRADE_SIZE_MAX_FOX = 1_100_000 // let them go a bit past a million

// Generate data for tradeSize and foxHolding
const tradeSizeData = [...Array(CHART_GRANULARITY).keys()].map(
  i => i * (CHART_TRADE_SIZE_MAX_USD / (CHART_GRANULARITY - 1)),
)
const foxHoldingData = [...Array(CHART_GRANULARITY).keys()].map(
  i => i * (CHART_TRADE_SIZE_MAX_FOX / (CHART_GRANULARITY - 1)),
)

// Calculate fee for each combination of tradeSize and foxHolding
const Z_bps = tradeSizeData.map(trade =>
  foxHoldingData.map(fox =>
    calculateFeeBps({ tradeAmountUsd: bn(trade), foxHeld: bn(fox) }).toNumber(),
  ),
)

const data: Data[] = [
  {
    z: Z_bps,
    x: foxHoldingData,
    y: tradeSizeData,
    hoverinfo: 'text',
    colorscale: 'YlGnBu',
    showscale: false,
    type: 'surface',
  },
]

const layout: Partial<Layout> = {
  autosize: true,
  hovermode: 'closest',
  width: 400,
  height: 400,
  margin: {
    l: 50,
    r: 50,
    b: 50,
    t: 50,
  },
  paper_bgcolor: 'rgba(13,15,16,0)', // how to set background color
  scene: {
    aspectratio: { x: 1, y: 1, z: 0.75 },
    xaxis: { title: 'FOX Held' },
    yaxis: { title: 'Trade Amount $' },
    zaxis: { title: 'Fee (bps)' },
    camera: { eye: { x: 1.2, y: 1.2, z: 1.2 } },
    domain: { x: [0, 1], y: [0, 1] },
    dragmode: 'turntable',
  },
}

const config = {
  displayModeBar: false,
}
const FeeChart: React.FC<FeeChartProps> = ({ onHover }) => {
  const handleHover = (event: Readonly<PlotHoverEvent>) => {
    console.log(event)
    const { x, y } = event.points[0]
    const hoverFoxHolding = x as number // narrow
    const hoverTradeSize = y as number // narrow
    onHover(hoverTradeSize, hoverFoxHolding)
  }

  return <Plot data={data} layout={layout} config={config} onHover={handleHover} />
}

type FeeSlidersProps = {
  tradeSize: number
  setTradeSize: (val: number) => void
  foxHolding: number
  setFoxHolding: (val: number) => void
}

const labelStyles = {
  fontSize: 'sm',
  mt: '2',
  color: 'text.subtle',
}

const FeeSliders: React.FC<FeeSlidersProps> = ({
  tradeSize,
  setTradeSize,
  foxHolding,
  setFoxHolding,
}) => {
  return (
    <VStack height='100%' spacing={12} mb={8}>
      <Stack width='full'>
        <Flex width='full' justifyContent='space-between'>
          <RawText>Trade Size</RawText>
          <Amount.Fiat value={tradeSize} />
        </Flex>
        <Box width='100%'>
          <Slider min={0} max={CHART_TRADE_SIZE_MAX_USD} value={tradeSize} onChange={setTradeSize}>
            <SliderMark value={0} {...labelStyles}>
              $0.00
            </SliderMark>
            <SliderMark value={100_000} {...labelStyles}>
              $100k
            </SliderMark>
            <SliderMark value={150_000} {...labelStyles}>
              $150k
            </SliderMark>
            <SliderMark value={250_000} {...labelStyles}>
              $250k
            </SliderMark>
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>
      </Stack>
      <Stack width='full'>
        <Flex width='full' justifyContent='space-between'>
          <Text>FOX Holding</Text>
          <Amount.Crypto value={foxHolding.toString()} symbol='FOX' />
        </Flex>
        <Box width='100%'>
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
          </Slider>
        </Box>
      </Stack>
    </VStack>
  )
}

type FeeOutputProps = {
  tradeSize: number
  foxHolding: number
}

export const FeeOutput: React.FC<FeeOutputProps> = ({ tradeSize, foxHolding }) => {
  const feeBps = calculateFeeBps({ tradeAmountUsd: bn(tradeSize), foxHeld: bn(foxHolding) })
  return (
    <Flex gap={4}>
      <Card flex={1}>
        <CardBody>
          <Amount.Crypto fontSize='3xl' value={feeBps.toFixed(2)} symbol='bps' />
          <RawText color='text.subtle'>Fee in bps</RawText>
        </CardBody>
      </Card>
      <Card flex={1}>
        <CardBody>
          <Amount.Fiat fontSize='3xl' value={feeBps.times(tradeSize).div(10000).toFixed(2)} />
          <RawText color='text.subtle'>Fee</RawText>
        </CardBody>
      </Card>
    </Flex>
  )
}

export const FeeExplainer = () => {
  const [tradeSize, setTradeSize] = useState(0)
  const [foxHolding, setFoxHolding] = useState(0)
  const onHover = (hoverTradeSize: number, hoverFoxHolding: number) => {
    setTradeSize(hoverTradeSize)
    setFoxHolding(hoverFoxHolding)
  }

  return (
    <Card flexDir='row' maxWidth='1200px' width='full' mx='auto'>
      <CardBody flex='1' p={{ base: 4, md: 8 }}>
        <Heading as='h5'>Calculate your FOX Savings</Heading>
        <RawText color='text.subtle'>
          Something about savings, put good copy in here that doesn't suck.
        </RawText>
        <Stack spacing={4} mt={6}>
          <FeeOutput tradeSize={tradeSize} foxHolding={foxHolding} />
          <FeeSliders
            tradeSize={tradeSize}
            setTradeSize={setTradeSize}
            foxHolding={foxHolding}
            setFoxHolding={setFoxHolding}
          />
        </Stack>
      </CardBody>
      <Flex flex='1' justifyContent='center' alignItems='center'>
        <FeeChart tradeSize={tradeSize} foxHolding={foxHolding} onHover={onHover} />
      </Flex>
    </Card>
  )
}
