import { Flex, Heading, useColorModeValue, useToken } from '@chakra-ui/react'
import styled from '@emotion/styled'
import { lighten } from 'polished'
import type { PropsWithChildren, ReactNode } from 'react'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { opacify } from 'theme/utils'

import { ChartType } from './SimpleChart'

const ChartErrorContainer = styled(Row)`
  position: absolute;
  width: max-content;
  align-items: flex-start;
  max-width: 320px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 20px;
  border: 1.3px solid var(--chakra-colors-border-base);
  background-color: var(--chakra-background-surface-base);
  padding: 12px 20px 12px 12px;
  position: relative;
  gap: 12px;
`
const ErrorTextColumn = styled(Flex)`
  white-space: normal;
`

function ChartErrorView({ children }: PropsWithChildren) {
  return (
    <ChartErrorContainer data-cy='chart-error-view'>
      <ErrorTextColumn gap='xs'>
        <Heading as='h4'>
          <Text translation='Missing chart data' />
        </Heading>
        <RawText color='text.subtle'>{children}</RawText>
      </ErrorTextColumn>
    </ChartErrorContainer>
  )
}

function ChartSkeletonAxes({
  height,
  fillColor,
  tickColor,
  hideYAxis,
}: {
  height: number
  fillColor: string
  tickColor: string
  hideYAxis?: boolean
}) {
  return (
    <g>
      <rect width='180' height='32' rx='4' y='0' fill={fillColor} />
      <rect width='80' height='13' rx='4' y='48' fill={fillColor} />
      <g transform={`translate(0, ${height - 14})`}>
        <rect width='7%' height='6' rx='3' x='10%' fill={tickColor} />
        <rect width='7%' height='6' rx='3' x='28.25%' fill={tickColor} />
        <rect width='7%' height='6' rx='3' x='46.5%' fill={tickColor} />
        <rect width='7%' height='6' rx='3' x='64.75%' fill={tickColor} />
        <rect width='7%' height='6' rx='3' x='83%' fill={tickColor} />
      </g>
      {!hideYAxis && (
        <g transform='translate(0, 10)'>
          <rect width='24' height='6' rx='3' y={(0 * height) / 5} x='96%' fill={tickColor} />
          <rect width='24' height='6' rx='3' y={(1 * height) / 5} x='96%' fill={tickColor} />
          <rect width='24' height='6' rx='3' y={(2 * height) / 5} x='96%' fill={tickColor} />
          <rect width='24' height='6' rx='3' y={(3 * height) / 5} x='96%' fill={tickColor} />
          <rect width='24' height='6' rx='3' y={(4 * height) / 5} x='96%' fill={tickColor} />
        </g>
      )}
    </g>
  )
}

function ChartLoadingStateMask({
  type,
  height,
  id,
}: {
  type: ChartType
  height: number
  id: string
}) {
  const [lightGray, darkGray] = useToken('colors', ['darkNeutral.100', 'darkNeutral.800'])
  const gray = useColorModeValue(lightGray, darkGray)
  switch (type) {
    case ChartType.LIQUIDITY:
      return (
        <>
          <defs>
            <linearGradient id={`${id}-gradient`} x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0' stopColor={gray}>
                <animate attributeName='offset' values='-1;3' dur='1.3s' repeatCount='indefinite' />
              </stop>
              <stop offset='0.5' stopColor={lighten(0.24, gray)}>
                <animate
                  attributeName='offset'
                  values='-0.5;3.5'
                  dur='1.3s'
                  repeatCount='indefinite'
                />
              </stop>
              <stop offset='1' stopColor={gray}>
                <animate attributeName='offset' values='0;4' dur='1.3s' repeatCount='indefinite' />
              </stop>
            </linearGradient>
          </defs>
          <mask id={id} style={{ maskType: 'alpha' }}>
            <path
              transform='translate(0, 150)'
              d='M2.24512 52.9648L9.50512 46.6228L16.7651 40.3808L24.0251 34.3378L31.2851 28.5881L38.5451 23.223L45.8051 18.3268L53.0651 13.9769L60.3251 10.2419L67.5851 7.18074L74.8451 4.84155L82.1051 3.26125L89.3651 2.46484H96.6251L103.885 3.26125L111.145 4.84155L118.405 7.18074L125.665 10.2419L132.925 13.9769L140.185 18.3268L147.445 23.223L154.705 28.5881L161.965 34.3378L169.225 40.3808L176.485 46.6228L191.005 59.3068L198.265 65.5488L205.525 71.5918L212.785 77.3418L220.045 82.7068L227.305 87.6028L234.565 91.9529L241.825 95.6879L249.085 98.7488L256.345 101.088L263.605 102.669L270.865 103.465H278.125L285.385 102.669L292.645 101.088L299.905 98.7488L307.165 95.6879L314.425 91.9529L321.685 87.6028L328.945 82.7068L336.205 77.3418L343.465 71.5918L350.725 65.5488L357.985 59.3068L372.505 46.6228L379.765 40.3808L387.025 34.3378L394.285 28.5881L401.545 23.223L408.805 18.3268L416.065 13.9769L423.325 10.2419L430.585 7.18074L437.845 4.84155L445.105 3.26125L452.365 2.46484H459.625L466.885 3.26125L474.145 4.84155L481.405 7.18074L488.665 10.2419L495.925 13.9769L503.185 18.3268L510.445 23.223L517.705 28.5881L524.965 34.3378L532.225 40.3808L539.485 46.6228L554.005 59.3068L561.265 65.5488L568.525 71.5918L575.785 77.3418L583.045 82.7068L590.305 87.6028L597.565 91.9529L604.825 95.6879L612.085 98.7488L619.345 101.088L626.605 102.669L633.865 103.465H641.125L648.385 102.669L655.645 101.088L662.905 98.7488L670.165 95.6879L677.425 91.9529L684.685 87.6028L691.945 82.7068L699.205 77.3418L706.465 71.5918L713.725 65.5488L720.985 59.3068L735.505 46.6228L742.765 40.3808L750.025 34.3378L757.285 28.5881L764.545 23.223L771.805 18.3268L779.065 13.9769L786.325 10.2419L793.585 7.18074L800.845 4.84155L808.105 3.26125L815.365 2.46484H822.625L829.885 3.26125L837.145 4.84155L844.405 7.18074L851.665 10.2419L858.925 13.9769L866.185 18.3268L873.445 23.223L880.705 28.5881L887.965 34.3378L895.225 40.3808L902.485 46.6228L917.005 59.3068L924.265 65.5488L931.525 71.5918L938.785 77.3418L946.045 82.7068L953.305 87.6028L960.565 91.9529L967.825 95.6879L975.085 98.7488L982.345 101.088L989.605 102.669L996.865 103.465H1004.13L1011.39 102.669L1018.65 101.088L1025.91 98.7488L1033.17 95.6879L1040.43 91.9529L1047.69 87.6028L1054.95 82.7068L1062.21 77.3418L1069.47 71.5918L1076.73 65.5488L1083.99 59.3068L1098.51 46.6228L1105.77 40.3808L1113.03 34.3378L1120.29 28.5881L1127.55 23.223L1134.81 18.3268L1142.07 13.9769L1149.33 10.2419L1156.59 7.18074L1163.85 4.84155L1171.11 3.26125L1178.37 2.46484H1185.63L1192.89 3.26125L1200.15 4.84155L1207.41 7.18074L1214.67 10.2419L1221.93 13.9769L1229.19 18.3268L1236.45 23.223L1243.71 28.5881L1250.97 34.3378L1258.23 40.3808L1265.49 46.6228L1280.01 59.3068L1287.27 65.5488L1294.53 71.5918L1301.79 77.3418L1309.05 82.7068L1316.31 87.6028L1323.57 91.9529L1330.83 95.6879L1338.09 98.7488L1345.35 101.088L1352.61 102.669L1359.87 103.465H1367.13L1374.39 102.669L1381.65 101.088L1388.91 98.7488L1396.17 95.6879L1403.43 91.9529L1410.69 87.6028L1417.95 82.7068L1425.21 77.3418L1432.47 71.5918L1439.73 65.5488L1446.99 59.3068L1454.25 52.9648'
              stroke='white'
              strokeWidth='4'
              strokeLinecap='round'
            />
          </mask>
        </>
      )
    case ChartType.VOLUME:
      return (
        <>
          <defs>
            <linearGradient id={`${id}-gradient`} x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0' stopColor={gray}>
                <animate
                  attributeName='offset'
                  values='-0.2;3.3'
                  dur='1.3s'
                  repeatCount='indefinite'
                />
              </stop>
              <stop offset='0.1' stopColor={lighten(0.05, gray)}>
                <animate
                  attributeName='offset'
                  values='-0.1;3.4'
                  dur='1.3s'
                  repeatCount='indefinite'
                />
              </stop>
              <stop offset='0.2' stopColor={gray}>
                <animate
                  attributeName='offset'
                  values='0;3.5'
                  dur='1.3s'
                  repeatCount='indefinite'
                />
              </stop>
            </linearGradient>
          </defs>
          <mask id={id} style={{ maskType: 'alpha' }}>
            <g transform={`translate(0, ${height - 30}) scale(1,-1)`}>
              <rect rx='3' width='9%' height='15%' x='0.0%' fill='white' />
              <rect rx='3' width='9%' height='30%' x='9.2%' fill='white' />
              <rect rx='3' width='9%' height='45%' x='18.4%' fill='white' />
              <rect rx='3' width='9%' height='60%' x='27.6%' fill='white' />
              <rect rx='3' width='9%' height='45%' x='36.8%' fill='white' />
              <rect rx='3' width='9%' height='30%' x='46.0%' fill='white' />
              <rect rx='3' width='9%' height='15%' x='55.2%' fill='white' />
              <rect rx='3' width='9%' height='30%' x='64.4%' fill='white' />
              <rect rx='3' width='9%' height='45%' x='73.6%' fill='white' />
              <rect rx='3' width='9%' height='60%' x='82.8%' fill='white' />
            </g>
          </mask>
        </>
      )
    default:
      return null
  }
}

export function ChartSkeleton({
  errorText,
  height,
  type,
  dim,
  hideYAxis,
}: {
  height: number
  errorText?: ReactNode
  type: ChartType
  dim?: boolean
  hideYAxis?: boolean
}) {
  const [lightGray, darkGray] = useToken('colors', ['darkNeutral.100', 'darkNeutral.800'])
  const gray = useColorModeValue(lightGray, darkGray)
  const neutral3Opacified = opacify(70, gray)

  const fillColor = errorText || dim ? neutral3Opacified : gray
  const tickColor = errorText ? opacify(12.5, gray) : neutral3Opacified

  const maskId = `mask-${type}-${height}`

  return (
    <Row>
      <svg width='100%' height={height} xmlns='http://www.w3.org/2000/svg' fill='none'>
        <ChartSkeletonAxes
          height={height}
          fillColor={fillColor}
          tickColor={tickColor}
          hideYAxis={hideYAxis}
        />
        <ChartLoadingStateMask id={maskId} type={type} height={height} />
        <g mask={`url(#${maskId})`}>
          <rect
            width='94%'
            height={height}
            rx='4'
            fill={errorText ? fillColor : `url(#${maskId}-gradient)`}
          />
        </g>
      </svg>
      {errorText && <ChartErrorView>{errorText}</ChartErrorView>}
    </Row>
  )
}
