import { Flex, Heading } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { UTCTimestamp } from 'lightweight-charts'
import type { PropsWithChildren, ReactElement, ReactNode } from 'react'
import { useTranslate } from 'react-polyglot'
import styled from 'styled-components'

import { useHeaderDateFormatter } from './hooks'

import { Row } from '@/components/Row/Row'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'

const ChartHeaderWrapper = (props: PropsWithChildren) => (
  <Flex position='absolute' width='full' gap={4} alignItems='flex-start' zIndex='4' {...props} />
)
const ChartHeaderLeftDisplay = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 14px;
  text-align: left;
  pointer-events: none;
  width: 70%;

  * {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

type HeaderValueDisplayProps = {
  /** The number to be formatted and displayed, or the ReactElement to be displayed */
  value?: number | ReactElement
}

function HeaderValueDisplay({ value }: HeaderValueDisplayProps) {
  const {
    number: { toFiat },
  } = useLocaleFormatter()

  if (typeof value !== 'number' && typeof value !== 'undefined') {
    return <>{value}</>
  }

  return (
    <Heading as='h3' lineHeight={1}>
      {toFiat(bnOrZero(value).toString())}
    </Heading>
  )
}

type HeaderTimeDisplayProps = {
  time?: UTCTimestamp
  /** Optional string to display when time is undefined */
  timePlaceholder?: string
}

function HeaderTimeDisplay({ time, timePlaceholder }: HeaderTimeDisplayProps) {
  const headerDateFormatter = useHeaderDateFormatter()
  const translate = useTranslate()
  return (
    <Heading as='h5' fontWeight='normal' color='text.subtle'>
      {time ? headerDateFormatter(time) : translate(timePlaceholder ?? '')}
    </Heading>
  )
}

interface ChartHeaderProps extends HeaderValueDisplayProps, HeaderTimeDisplayProps {
  additionalFields?: ReactNode
}

export function ChartHeader({ value, time, timePlaceholder, additionalFields }: ChartHeaderProps) {
  return (
    <ChartHeaderWrapper>
      <ChartHeaderLeftDisplay>
        <HeaderValueDisplay value={value} />
        <Row gap='sm'>
          {additionalFields}
          <HeaderTimeDisplay time={time} timePlaceholder={timePlaceholder} />
        </Row>
      </ChartHeaderLeftDisplay>
    </ChartHeaderWrapper>
  )
}
