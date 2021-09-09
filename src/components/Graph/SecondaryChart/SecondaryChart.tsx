import { HistoryData } from '@shapeshiftoss/market-service'
import { Brush } from '@visx/brush'
import BaseBrush from '@visx/brush/lib/BaseBrush'
import { Bounds } from '@visx/brush/lib/types'
import { LinearGradient } from '@visx/gradient'
import { ScaleSVG } from '@visx/responsive'
import { scaleLinear, scaleTime } from '@visx/scale'
import { extent, max, min } from 'd3-array'
import React, { useContext, useMemo, useRef } from 'react'
import { MarketContext } from 'context/MarketProvider'
import { colors } from 'theme/colors'

import { AreaChart } from '../AreaChart/AreaChart'

export interface SecondaryChartProps {
  data: HistoryData[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
}

export const SecondaryChart = ({
  data,
  width = 10,
  height,
  margin = { top: 0, right: 0, bottom: 0, left: 0 }
}: SecondaryChartProps) => {
  const {
    filteredDataState: { setFilteredData }
  } = useContext(MarketContext)
  const brushRef = useRef<BaseBrush | null>(null)

  // bounds
  const xMax = Math.max(width - margin.left - margin.right, 0)
  const yMax = Math.max(height - margin.top - margin.bottom, 0)

  // accessors
  const getDate = (d: HistoryData) => new Date(d.date)
  const getStockValue = (d: HistoryData) => d.price

  // scales
  const dateScale = React.useMemo(() => {
    return scaleTime({
      range: [0, xMax],
      domain: extent(data, getDate) as [Date, Date]
    })
  }, [xMax, data])
  const priceScale = React.useMemo(() => {
    return scaleLinear({
      range: [yMax + margin.top, margin.top],
      domain: [min(data, getStockValue) || 0, max(data, getStockValue) || 0],
      nice: true
    })
    //
  }, [margin.top, yMax, data])

  const initialBrushPosition = useMemo(
    () => ({
      start: { x: dateScale(getDate(data[0])) },
      end: { x: dateScale(getDate(data[data.length - 1])) }
    }),
    [dateScale, data]
  )

  React.useEffect(() => {
    if (data.length) {
      setFilteredData(data)
    }
  }, [data, setFilteredData])

  const onBrushChange = (domain: Bounds | null) => {
    if (!domain) return
    const { x0, x1, y0, y1 } = domain
    const filteredData = data.filter(s => {
      const x = getDate(s).getTime()
      const y = getStockValue(s)
      return x > x0 && x < x1 && y > y0 && y < y1
    })

    setFilteredData(filteredData)
  }

  return (
    <div style={{ position: 'relative' }}>
      <ScaleSVG width={width} height={height}>
        <AreaChart
          hideLeftAxis
          data={data}
          width={width}
          margin={{ ...margin }}
          yMax={yMax}
          xScale={dateScale}
          yScale={priceScale}
          gradientColor={colors.green[500]}
        >
          <LinearGradient
            id='brush-gradient'
            from={colors.blue[500]}
            fromOpacity={0.3}
            to={colors.blue[500]}
            toOpacity={0.3}
          />

          <Brush
            innerRef={brushRef}
            xScale={dateScale}
            yScale={priceScale}
            width={xMax}
            height={yMax}
            margin={{ ...margin }}
            handleSize={8}
            resizeTriggerAreas={['left', 'right']}
            brushDirection='horizontal'
            initialBrushPosition={initialBrushPosition}
            onChange={onBrushChange}
            onClick={() => {
              setFilteredData(data)
            }}
            selectedBoxStyle={{
              fill: `url(#brush-gradient)`,
              stroke: colors.blue[500]
            }}
          />
        </AreaChart>
      </ScaleSVG>
    </div>
  )
}
